import { WalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base"
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile"
import {
  Cluster,
  isInWebView,
  isOnAndroid,
  SolanaMobileWalletAdapterWalletName,
  convertToWalletStandardCluster,
} from "@solana-wallets/core"

export function getMobileWallet(wallets: WalletAdapterCompatibleStandardWallet[], env: Cluster) {
  /**
   * Return if Mobile wallet adapter is already in the list or if ReadyState is Installed.
   *
   * There are only two ways a browser extension adapter should be able to reach `Installed` status:
   *   1. Its browser extension is installed.
   *   2. The app is running on a mobile wallet's in-app browser.
   * In either case, we consider the environment to be desktop-like and not 'mobile'.
   */
  if (wallets.some(({ name }) => name === SolanaMobileWalletAdapterWalletName)) {
    return
  }

  const ua = window.navigator?.userAgent
  if (!ua) {
    return
  }

  const getUriForAppIdentity = () => {
    const { location } = globalThis
    if (location) {
      return `${location.protocol}//${location.host}`
    }
  }

  /**
   * Return Mobile Wallet Adapter object if we are running
   * on a device that supports MWA like Android
   * and we are *not* running in a WebView.
   */
  alert(`android: ${isOnAndroid(ua)}, webview: ${isInWebView(ua)}, env: ${env}`)
  if (isOnAndroid(ua) && !isInWebView(ua)) {
    const network = convertToWalletStandardCluster(env)
    const mobileWalletAdapter = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: {
        uri: getUriForAppIdentity(),
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      chain: `solana:${network}`,
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    })
    return mobileWalletAdapter
  }
}
