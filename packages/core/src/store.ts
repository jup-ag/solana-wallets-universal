import { type Wallet as StandardWallet } from "@wallet-standard/base"
import { atom, computed, onSet } from "nanostores"
import {
  isWalletAdapterCompatibleStandardWallet,
  WalletName,
  WalletAdapterCompatibleStandardWallet,
} from "@solana/wallet-adapter-base"
import {
  SolanaSignAndSendTransaction,
  SolanaSignAndSendTransactionInput,
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignTransactionInput,
} from "@solana/wallet-standard-features"
import { getWallets } from "@wallet-standard/app"
import { base58 } from "@scure/base"

import {
  dispatchAvailableWalletsChanged,
  dispatchConnecting,
  dispatchWalletChanged,
  StandardEventChangeProperties,
  StandardWalletConnectResult,
  getEvent,
  ConnectEvent,
  StandardEvent,
  WalletEvent,
} from "./events"
import { getLocalStorage, setLocalStorage } from "./localstorage"
// import { detectedFirst, isInWebView, isIosAndWebView, isOnAndroid } from "./utils"

export type Cluster = "devnet" | "testnet" | "mainnet-beta"

export function initStore() {
  const $wallets = atom<WalletAdapterCompatibleStandardWallet[]>([])
  onSet($wallets, ({ newValue }) => {
    dispatchAvailableWalletsChanged(newValue)
  })

  const $walletsMap = computed($wallets, wallets => {
    return wallets.reduce<Record<string, WalletAdapterCompatibleStandardWallet>>(
      (_walletsByName, newWallet) => {
        const name = newWallet.name
        const existing = _walletsByName[name]
        // Add wallet adapter if not yet added
        if (!existing) {
          _walletsByName[name] = newWallet
          return _walletsByName
        }
        return _walletsByName
      },
      {},
    )
  })

  const $connectedAccount = atom<StandardWalletConnectResult>()
  onSet($connectedAccount, ({ newValue }) => {
    dispatchWalletChanged(newValue)
  })

  const $isConnected = computed($connectedAccount, acc => !!acc)
  const $wallet = computed([$connectedAccount, $walletsMap], (acc, walletsMap) => {
    if (!acc) {
      return
    }
    return walletsMap[acc.name]
  })

  const $env = atom<Cluster>("mainnet-beta")
  const $connecting = atom<boolean>(false)
  onSet($connecting, ({ newValue }) => {
    dispatchConnecting(newValue)
  })
  const $disconnecting = atom<boolean>(false)
  // Selected wallet connection state
  // export const $ready = atom<WalletReadyState>(WalletReadyState.Unsupported)

  function onConnect(
    event: StandardEventChangeProperties,
    wallet: WalletAdapterCompatibleStandardWallet,
  ) {
    if (!event.accounts || event.accounts.length === 0) {
      return
    }
    const first = event.accounts[0]
    if (!first) {
      return
    }
    const newWallet: StandardWalletConnectResult = {
      type: "standard",
      name: wallet.name,
      icon: wallet.icon,
      account: first,
      pubKey: base58.encode(first.publicKey),
    }
    $connectedAccount.set(newWallet)
  }

  function onDisconnect(event: StandardEventChangeProperties) {
    if (!event.accounts) {
      return
    }
    const first = event.accounts[0]
    if (!first) {
      return
    }
    updateWallet()
  }

  function removeAdapterEventListeners(
    _wallet?: WalletAdapterCompatibleStandardWallet | undefined,
  ): void {
    _wallet = _wallet ? _wallet : $wallet.get()
    if (_wallet) {
      _wallet.features["standard:events"].on("change", e => onChangeEvent(e, _wallet))
    }
  }

  /**
   * @throws Error
   */
  async function connectStandardWallet(name: string): Promise<StandardWalletConnectResult> {
    const wallet = $walletsMap.get()[name]
    if (!wallet) {
      throw new Error(`connectStandardWallet: wallet with name: ${name} does not exist!`)
    }
    if (!("standard:connect" in wallet.features)) {
      throw new Error(
        `connectStandardWallet: standard wallet does NOT have standard:connect feature enabled!`,
      )
    }
    const res = await wallet.features["standard:connect"].connect()
    if (res.accounts.length === 0) {
      throw new Error(`connectStandardWallet: no accounts available!`)
    }
    const acc = res.accounts[0]
    if (!acc) {
      throw new Error(`connectStandardWallet: account failed to connect!`)
    }
    return {
      name,
      icon: wallet.icon,
      type: "standard",
      pubKey: base58.encode(acc.publicKey),
      account: acc,
    }
  }

  /**
   * @throws Error
   */
  async function connectWallet(name: string): Promise<void> {
    if ($connecting.get() || $disconnecting.get()) {
      throw new Error("connect: failed to connect, already connecting/disconnecting")
    }

    // if (!(_ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable)) {
    //   console.error("failed to connect, invalid ready state (not installed/loadable)")
    //   updateWallet()
    //   // if (typeof window !== "undefined") {
    //   //   window.open(wallet.url, "_blank")
    //   // }
    //   throw new WalletNotReadyError()
    // }

    try {
      $connecting.set(true)
      dispatchConnecting(true)
      const res = await connectStandardWallet(name)
      if (!res) {
        throw new Error("connect: failed to connect, missing response after connecting wallet")
      }
      $connectedAccount.set(res)
    } catch (error: unknown) {
      console.error("failed to connect, error occurred connecting: ", { error })
      updateWallet()
    } finally {
      $connecting.set(false)
      dispatchConnecting(false)
    }
  }

  async function updateWallet(name?: string | undefined) {
    setLocalStorage("unified:wallet", name)

    if (!name) {
      // $ready.set(WalletReadyState.NotDetected)
      $connectedAccount.set(undefined)
      return
    }

    /**
     * Update connect/disconnect event listeners
     * to track newly connected wallet
     */
    removeAdapterEventListeners()
    // newAdapter.on("disconnect", onDisconnect)

    await connectWallet(name)
  }

  async function disconnect(): Promise<void> {
    if ($disconnecting.get()) {
      return
    }
    const _adapter = $wallet.get()
    if (!_adapter) {
      console.error(
        "disconnect: resetting wallet since cannot disconnect from nonexistent adapter: ",
        _adapter,
      )
      updateWallet()
      return
    }
    try {
      $disconnecting.set(true)
      if ("standard:disconnect" in _adapter.features) {
        await _adapter.features["standard:disconnect"].disconnect()
      }
    } finally {
      $disconnecting.set(false)
      updateWallet()
    }
  }

  /**
   * Update standard wallet connected account + public key
   * when change event detected
   */
  async function onChange(w: StandardWallet, changes: StandardEventChangeProperties) {
    console.log("standard event change captured: ", {
      name: w.name,
      accounts: changes.accounts,
    })
    const connectedWalletName = $wallet.get()?.name
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
        onConnect(changes, {
          name: w.name,
          accounts: w.accounts,
          icon: w.icon,
          chains: w.chains,
          version: w.version,
          features: w.features as any,
        })
      } else {
        onDisconnect(changes)
      }
      // } else if (props.disconnectOnAccountChange) {
      //   disconnect()
      // }
    }

    $wallets.set(getStandardWallets())
  }

  function onChangeEvent(
    changeProperties: StandardEventChangeProperties,
    wallet: WalletAdapterCompatibleStandardWallet,
  ) {
    const event = getEvent(changeProperties)
    if (event === StandardEvent.CONNECT) {
      onConnect(changeProperties, wallet)
    } else if (event === StandardEvent.DISCONNECT) {
      onDisconnect(changeProperties)
    }
  }

  /**
   * Invalidate adapter listeners before refreshing the page
   */
  function onMountClearAdapterEventListeners() {
    console.log("onMountClearAdapterEventListeners")
    window.addEventListener("beforeunload", () => removeAdapterEventListeners())
    return () => {
      window.removeEventListener("beforeunload", () => removeAdapterEventListeners())
    }
  }

  async function connectHandler(_event: Event) {
    const event = _event as ConnectEvent
    await select(event.detail.wallet)
  }

  async function disconnectHandler(_event: Event) {
    await disconnect()
  }

  /**
   * Loads event handlers for connecting/disconnecting,
   * expected to be run on mount in the framework-specific
   * context provider with `cleanupConnectHandlers`
   */
  function loadConnectHandlers() {
    window.addEventListener(WalletEvent.CONNECT, connectHandler)
    window.addEventListener(WalletEvent.DISCONNECT, disconnectHandler)
  }

  /**
   * Cleans up event handlers for connecting/disconnecting,
   * expected to be run on cleanup in the framework-specific
   * context provider with `loadConnectHandlers`
   */
  function cleanupConnectHandlers() {
    window.removeEventListener(WalletEvent.CONNECT, connectHandler)
    window.removeEventListener(WalletEvent.DISCONNECT, disconnectHandler)
  }

  function getStandardWallets(): WalletAdapterCompatibleStandardWallet[] {
    const { get } = getWallets()
    return get().filter(w => isWalletAdapterCompatibleStandardWallet(w))
  }

  function onMountLoadWallets() {
    console.log("onMountLoadWallets")

    const { on } = getWallets()
    const initializedWallets = getStandardWallets().map(w => {
      w.features["standard:events"].on("change", async x => {
        console.log({ x })
        await onChange(w, x)
      })
      return w
    })

    console.log({ initializedWallets })

    /**
     * Store standard wallets initially available
     */
    $wallets.set(initializedWallets)
    const addWallet = () => {
      $wallets.set(getStandardWallets())
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

  async function select(name: string): Promise<void> {
    const existingName = $wallet.get()?.name

    if (existingName === name) {
      console.error("adapter already connected")
      return
    }

    const _wallet = $wallet.get()
    if (_wallet) {
      console.error("another wallet connected, disconnecting: ", { _wallet })
      await disconnect()
    }

    updateWallet(name)
  }

  /*
   * Automatically connect to most recently connected wallet
   */
  async function onMountAutoConnect() {
    const walletName = getLocalStorage<WalletName>("adapter-name")
    console.log("onMountAutoConnect: ", { walletName })
    if (!walletName) {
      return
    }
    await select(walletName)
  }

  function initOnMount(): () => void {
    const cleanup = onMountClearAdapterEventListeners()
    loadConnectHandlers()
    const cleanup2 = onMountLoadWallets()
    onMountAutoConnect()
    return () => {
      cleanup()
      cleanup2()
      cleanupConnectHandlers()
    }
  }

  async function signTransaction(txBytes: Uint8Array) {
    const connectedAccount = $connectedAccount.get()
    const wallet = $wallet.get()
    if (!connectedAccount || !wallet) {
      throw new Error("signTransaction failed, missing adapter/public key!")
    }

    if (!(SolanaSignTransaction in wallet.features)) {
      throw new Error("solana:signTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.account
    const feature = wallet.features[SolanaSignTransaction]
    const input: SolanaSignTransactionInput = {
      account: acc,
      transaction: txBytes,
    }

    const res = await feature.signTransaction(input)
    if (res.length === 0 || !res[0]) {
      throw new Error("failed to sign tx, missing sign tx output")
    }
    return res[0].signedTransaction
  }

  async function signAllTransactions(txs: Uint8Array[]) {
    const connectedAccount = $connectedAccount.get()
    const wallet = $wallet.get()
    if (!connectedAccount || !wallet) {
      throw new Error("signAllTransactions failed, missing adapter/public key!")
    }

    if (!(SolanaSignTransaction in wallet.features)) {
      throw new Error("solana:signTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.account
    const feature = wallet.features[SolanaSignTransaction]
    const inputs: SolanaSignTransactionInput[] = txs.map(tx => ({
      account: acc,
      transaction: tx,
    }))
    const res = await feature.signTransaction(...inputs)
    if (res.length === 0 || !res[0]) {
      throw new Error("solana:signTransaction failed, missing sign all txs output")
    }
    return res[0].signedTransaction
  }

  async function signMessage(tx: Uint8Array): Promise<Uint8Array> {
    const connectedAccount = $connectedAccount.get()
    const wallet = $wallet.get()
    if (!connectedAccount || !wallet) {
      throw new Error("signMessage failed, missing adapter/public key!")
    }

    if (!(SolanaSignMessage in wallet.features)) {
      throw new Error("solana:signMessage NOT found in standard wallet features")
    }

    const acc = connectedAccount.account
    const feature = wallet.features[SolanaSignMessage]
    const res = await feature.signMessage({
      account: acc,
      message: tx,
    })
    const firstRes = res[0]
    if (!firstRes) {
      throw new Error("failed to sign message, missing sign message output")
    }
    return firstRes.signature
  }

  async function sendTransaction(txBytes: Uint8Array) {
    const connectedAccount = $connectedAccount.get()
    const wallet = $wallet.get()
    if (!connectedAccount || !wallet) {
      throw new Error("sendTransaction failed: missing adapter / public key!")
    }

    if (!(SolanaSignAndSendTransaction in wallet.features)) {
      throw new Error("solana:signAndSendTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.account
    const input: SolanaSignAndSendTransactionInput = {
      account: acc,
      transaction: txBytes,
      chain: "solana:devnet",
    }

    const feature = wallet.features[SolanaSignAndSendTransaction]
    const res = await feature.signAndSendTransaction(input)

    if (res.length === 0 || !res[0]) {
      throw new Error("Missing tx output from signAndSendTx from connected standard wallet!")
    }
    return res[0].signature
  }

  return {
    $wallets,
    $walletsMap,
    $connectedAccount,
    $isConnected,
    $wallet,

    $env,
    $connecting,
    $disconnecting,

    initOnMount,
    signMessage,
    signTransaction,
    signAllTransactions,
    sendTransaction,
  }
}

export type Store = ReturnType<typeof initStore>

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
