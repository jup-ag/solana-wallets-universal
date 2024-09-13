import { Wallet, WalletAccount, type Wallet as StandardWallet } from "@wallet-standard/base"
import { atom, computed } from "nanostores"
import {
  isWalletAdapterCompatibleStandardWallet,
  WalletName,
  WalletNotReadyError,
  WalletReadyState,
  WalletAdapterCompatibleStandardWallet,
} from "@solana/wallet-adapter-base"
// import { SolanaSignTransaction, SolanaSignTransactionInput } from "@solana/wallet-standard-features"
import { getWallets } from "@wallet-standard/app"
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-adapter-mobile"

import { getLocalStorage, setLocalStorage } from "./localstorage"
// import { detectedFirst, isInWebView, isIosAndWebView, isOnAndroid } from "./utils"
import { Cluster } from "./useWalletNano"
import { isInWebView, isOnAndroid } from "./utils"

export const $wallets = atom<WalletAdapterCompatibleStandardWallet[]>([])
// export const $wallets = atom<Wallet[]>([])

export const $publicKey = atom<Uint8Array | undefined>()

export const $connected = computed($publicKey, pubKey => !!pubKey)
export const $account = atom<WalletAccount | undefined>()
export const $wallet = atom<WalletAdapterCompatibleStandardWallet | undefined>()
export const $name = computed($wallet, wallet => wallet?.name)

export const $env = atom<Cluster>("mainnet-beta")
export const $connecting = atom<boolean>(false)
export const $disconnecting = atom<boolean>(false)
// Selected wallet connection state
export const $ready = atom<WalletReadyState>(WalletReadyState.Unsupported)

export const $walletsMap = computed($wallets, wallets => {
  return wallets.reduce<Record<string, WalletAdapterCompatibleStandardWallet>>(
    (_walletsByName, newWallet) => {
      const name = newWallet.name
      const existing = _walletsByName[name]
      // Add wallet adapter if not yet added
      if (!existing) {
        _walletsByName[name] = newWallet
        return _walletsByName
      }
      // // Don't update existing custom wallet adapters
      // if (!(existing instanceof StandardWalletAdapter)) {
      //   return _walletsByName
      // }
      // // ALWAYS update standard wallet adapter, we assume
      // // that any
      // if (newWallet instanceof StandardWalletAdapter) {
      //   _walletsByName[newWallet.adapter.name] = newWallet.adapter
      //   return _walletsByName
      // }
      return _walletsByName
    },
    {},
  )
})

export type StandardEventChangeProperties = {
  readonly chains?: Wallet["chains"]
  readonly features?: Wallet["features"]
  readonly accounts?: Wallet["accounts"]
}
const Event = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
} as const
export type Event = (typeof Event)[keyof typeof Event]
function getEvent(event: StandardEventChangeProperties): Event | undefined {
  if (!event.features && !event.chains && event.accounts) {
    if (event.accounts.length > 0) {
      return Event.CONNECT
    } else {
      return Event.DISCONNECT
    }
  }
}
function onChangeEvent(changeProperties: StandardEventChangeProperties) {
  const event = getEvent(changeProperties)
  if (event === Event.CONNECT) {
    onConnect(changeProperties)
  } else if (event === Event.DISCONNECT) {
    onDisconnect(changeProperties)
  }
}

function onConnect(event: StandardEventChangeProperties) {
  if (!event.accounts || event.accounts.length === 0) {
    return
  }
  const first = event.accounts[0]
  if (!first) {
    return
  }
  $account.set(first)
  $publicKey.set(first.publicKey)
}

function onDisconnect(event: StandardEventChangeProperties) {
  if (!event.accounts) {
    return
  }
  const first = event.accounts[0]
  if (!first) {
    return
  }
  resetWallet()
}

function resetWallet() {
  updateWallet(undefined)
}

function removeAdapterEventListeners(
  _wallet?: WalletAdapterCompatibleStandardWallet | undefined,
): void {
  _wallet = _wallet ? _wallet : $wallet.get()
  if (_wallet) {
    _wallet.features["standard:events"].on("change", onChangeEvent)
  }
}

type StandardWalletConnectResult =
  | {
      type: "standard"
      pubKey: Uint8Array
      account: WalletAccount
    }
  | undefined

async function connectStandardWallet(
  wallet: WalletAdapterCompatibleStandardWallet,
): Promise<StandardWalletConnectResult> {
  if (!("standard:connect" in wallet.features)) {
    console.error("standard wallet does NOT have standard:connect feature enabled!")
    return
  }
  const res = await wallet.features["standard:connect"].connect()
  if (res.accounts.length === 0) {
    return
  }
  const acc = res.accounts[0]
  if (!acc) {
    console.error("account not connected: ", { acc })
    return
  }
  return {
    type: "standard",
    pubKey: acc.publicKey,
    account: acc,
  }
}

export async function connect(wallet: WalletAdapterCompatibleStandardWallet): Promise<void> {
  if ($connecting.get() || $disconnecting.get()) {
    console.error("failed to connect, currently connecting/disconnecting")
    return
  }
  const _ready = $ready.get()

  if (!(_ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable)) {
    console.error("failed to connect, invalid ready state (not installed/loadable)")
    resetWallet()
    // if (typeof window !== "undefined") {
    //   window.open(wallet.url, "_blank")
    // }
    throw new WalletNotReadyError()
  }

  try {
    $connecting.set(true)
    const res = await connectStandardWallet(wallet)
    if (!res) {
      console.error("failed to connect, missing response after connecting wallet")
      return
    }
    $publicKey.set(res.pubKey)
    $account.set(res.account)
  } catch (error: unknown) {
    console.error("failed to connect, error occurred connecting: ", { error })
    resetWallet()
  } finally {
    $connecting.set(false)
  }
}

export async function updateWallet(newWallet: WalletAdapterCompatibleStandardWallet | undefined) {
  setLocalStorage("wallet-name", newWallet?.name)

  if (!newWallet) {
    $ready.set(WalletReadyState.NotDetected)
    $publicKey.set(undefined)
    $wallet.set(undefined)
    return
  }

  /**
   * Update connect/disconnect event listeners
   * to track newly connected wallet
   */
  removeAdapterEventListeners()
  // newAdapter.on("disconnect", onDisconnect)

  $ready.set(WalletReadyState.Loadable)
  $wallet.set(newWallet)

  await connect(newWallet)
}

export async function disconnect(): Promise<void> {
  if ($disconnecting.get()) {
    return
  }
  const _adapter = $wallet.get()
  if (!_adapter) {
    console.error(
      "disconnect: resetting wallet since cannot disconnect from nonexistent adapter: ",
      _adapter,
    )
    resetWallet()
    return
  }
  try {
    $disconnecting.set(true)
    if ("standard:disconnect" in _adapter.features) {
      await _adapter.features["standard:disconnect"].disconnect()
    }
  } finally {
    $disconnecting.set(false)
    $publicKey.set(undefined)
    resetWallet()
  }
}

/**
 * Update standard wallet connected account + public key
 * when change event detected
 */
export async function onChange(w: StandardWallet, changes: StandardEventChangeProperties) {
  console.log("standard event change captured: ", {
    name: w.name,
    accounts: changes.accounts,
  })
  const connectedWalletName = $name.get()
  if (connectedWalletName && connectedWalletName === w.name) {
    /**
     * w.accounts is empty ONLY IF
     *	1. a disconnect event occurred
     *	2. user switched wallet account BUT this particular
     *  wallet does NOT allow automatic connection to other
     *  accounts without explicit user permission e.g
     *  auto-connect not checked (Solflare)
     *
     *  if (2) occurs, we disconnect from the wallet to
     *  reflect the wallet's rejection of the account change
     */
    const acc = changes.accounts && changes.accounts[0]
    console.log("standard wallet change detected: ", { changes })
    if (acc) {
      onConnect(changes)
    } else {
      onDisconnect(changes)
    }
    // } else if (props.disconnectOnAccountChange) {
    //   disconnect()
    // }
  }

  const { get } = getWallets()
  $wallets.set([...getStandardWallets(get())])
}

/**
 * Invalidate adapter listeners before refreshing the page
 */
export function onMountClearAdapterEventListeners() {
  console.log("onMountClearAdapterEventListeners")
  window.addEventListener("beforeunload", () => removeAdapterEventListeners())
  return () => {
    window.removeEventListener("beforeunload", () => removeAdapterEventListeners())
  }
}

function getStandardWallets(wallets: readonly Wallet[]): WalletAdapterCompatibleStandardWallet[] {
  return wallets.filter(w => isWalletAdapterCompatibleStandardWallet(w))
}

export function onMountLoadWallets() {
  console.log("onMountLoadWallets")

  const { on, get } = getWallets()
  const initializedWallets = get()
    .filter(w => isWalletAdapterCompatibleStandardWallet(w))
    .map((w, i) => {
      console.log(`raw wallet ${i + 1}: `, w)
      w.features["standard:events"].on("change", async x => {
        console.log({ x })
        await onChange(w, x)
      })
      return w
    })

  /**
   * Store standard wallets initially available
   */
  $wallets.set(initializedWallets)
  const addWallet = () => {
    $wallets.set([...getStandardWallets(get())])
  }

  /**
   * Add listeners for standard wallets registered
   * AFTER initial `get` call
   */
  const removeRegisterListener = on("register", addWallet)
  const removeUnregisterListener = on("unregister", addWallet)
  return () => {
    removeRegisterListener()
    removeUnregisterListener()
  }
}

export async function select(newWallet: WalletAdapterCompatibleStandardWallet): Promise<void> {
  const newName = newWallet.name
  const existingName = $name.get()

  if (existingName === newName) {
    console.error("adapter already connected")
    return
  }

  const _wallet = $wallet.get()
  if (_wallet) {
    console.error("another wallet connected, disconnecting: ", { _wallet })
    await disconnect()
  }

  updateWallet(newWallet)
}

// function getMobileWallet(wallets: WalletAdapterCompatibleStandardWallet[]) {
//   /**
//    * Return null if Mobile wallet adapter is already in the list or if ReadyState is Installed.
//    *
//    * There are only two ways a browser extension adapter should be able to reach `Installed` status:
//    *   1. Its browser extension is installed.
//    *   2. The app is running on a mobile wallet's in-app browser.
//    * In either case, we consider the environment to be desktop-like and not 'mobile'.
//    */
//   if (
//     wallets.some(
//       ({ name,  }) =>
//         name === SolanaMobileWalletAdapterWalletName,
//     )
//   ) {
//     return null
//   }
//
//   const ua = globalThis.navigator?.userAgent ?? null
//
//   const getUriForAppIdentity = () => {
//     const { location } = globalThis
//     if (location) {
//       return `${location.protocol}//${location.host}`
//     }
//   }
//
//   /**
//    * Return Mobile Wallet Adapter object if we are running
//    * on a device that supports MWA like Android
//    * and we are *not* running in a WebView.
//    */
//   if (ua && isOnAndroid(ua) && !isInWebView(ua)) {
//     const mobileWalletAdapter = new SolanaMobileWalletAdapter({
//       addressSelector: createDefaultAddressSelector(),
//       appIdentity: {
//         uri: getUriForAppIdentity(),
//       },
//       authorizationResultCache: createDefaultAuthorizationResultCache(),
//       chain: $env.get(),
//       onWalletNotFound: createDefaultWalletNotFoundHandler(),
//     })
//
//     console.log(
//       "adding new solana mobile wallet adapter! (mobile + android + not webview): ",
//       mobileWalletAdapter,
//     )
//     return mobileWalletAdapter
//   }
// }

/** Add ready state change listeners for all wallets,
 * wallet state should update regardless of whether
 * any wallet is currently connected
 */
// function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
//   // setReady(_adapter.readyState)
//   // When the wallets change, start to listen for changes to their `readyState`
// const newWallets = wallets.get().filter((w) => w.adapter.name === this.name )
//   setWallets(ws => ws.adapter.name === this.name, { adapter: this, readyState })
// }

/**
 * Add handlers for updating wallet ready states
 */
// export function onMountUpdateWalletsReadyStateChange() {
//   wallets.get().forEach(({ adapter }) => {
//     adapter.on("readyStateChange", onReadyStateChange, adapter)
//   })
//   onCleanup(() => {
//     wallets.forEach(({ adapter }) => {
//       adapter.off("readyStateChange", onReadyStateChange, adapter)
//     })
//   })
// }

/*
 * Automatically connect to most recently connected wallet
 */
export async function onMountAutoConnect() {
  console.log("onMountAutoConnect")
  const walletName = getLocalStorage<WalletName>("adapter-name")
  if (!walletName) {
    return
  }
  const adapter = $walletsMap.get()[walletName]
  if (!adapter) {
    return
  }
  await select(adapter)
}
