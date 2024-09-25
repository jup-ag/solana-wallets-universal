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
  address,
  getTransactionEncoder,
  SignatureBytes,
  TransactionSendingSigner,
} from "@solana/web3.js"

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
import { getLocalStorage, KEYS, setLocalStorage } from "./localstorage"
import { THardcodedWalletStandardAdapter } from "./hardcoded-wallet-adapter"
import { HARDCODED_WALLET_STANDARDS } from "./constants"
import { isIosAndRedirectable, isIosAndWalletApp } from "./environment"

export type Cluster = "devnet" | "testnet" | "mainnet-beta"

type StoreProps = {
  env?: Cluster
  autoConnect: boolean
  disconnectOnAccountChange: boolean
  // localStorageKey: string
}

export type WalletInfo =
  | { type: "ios-webview"; wallet: THardcodedWalletStandardAdapter }
  | { type: "standard"; wallet: WalletAdapterCompatibleStandardWallet }

export function initStore({ env, disconnectOnAccountChange }: StoreProps) {
  const $wallets = atom<WalletInfo[]>([])
  onSet($wallets, ({ newValue }) => {
    dispatchAvailableWalletsChanged(newValue)
  })

  const $walletsMap = computed($wallets, wallets => {
    if (!wallets) {
      return
    }
    return wallets.reduce<Record<string, WalletInfo>>((_walletsByName, newWallet) => {
      const name = newWallet.wallet.name
      const existing = _walletsByName[name]
      // Add wallet adapter if not yet added
      if (!existing) {
        _walletsByName[name] = newWallet
        return _walletsByName
      }
      return _walletsByName
    }, {})
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
    return walletsMap?.[acc.name]
  })

  const $env = atom<Cluster>(env ?? "mainnet-beta")
  onSet($env, ({ newValue }) => {
    console.log("new env value: ", { newValue })
  })

  const $connecting = atom<boolean>(false)
  onSet($connecting, ({ newValue }) => {
    dispatchConnecting(newValue)
  })

  const $disconnecting = atom<boolean>(false)

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

  function removeAdapterEventListeners(walletInfo?: WalletInfo): void {
    walletInfo = walletInfo ? walletInfo : $wallet.get()
    if (walletInfo && walletInfo.type === "standard") {
      walletInfo.wallet.features["standard:events"].on("change", e =>
        onChangeEvent(e, walletInfo.wallet),
      )
    }
  }

  /**
   * @throws Error
   */
  async function connectStandardWallet(name: string): Promise<StandardWalletConnectResult> {
    const walletInfo = $walletsMap.get()?.[name]
    if (!walletInfo) {
      throw new Error(`connectStandardWallet: wallet with name: ${name} does not exist!`)
    }
    if (walletInfo.type !== "standard") {
      throw new Error("`connectStandardWallet: cannot connect to non-standard wallet")
    }
    if (!("standard:connect" in walletInfo.wallet.features)) {
      throw new Error(
        `connectStandardWallet: standard wallet does NOT have standard:connect feature enabled!`,
      )
    }
    const res = await walletInfo.wallet.features["standard:connect"].connect()
    if (res.accounts.length === 0) {
      throw new Error(`connectStandardWallet: no accounts available!`)
    }
    const acc = res.accounts[0]
    if (!acc) {
      throw new Error(`connectStandardWallet: account failed to connect!`)
    }
    return {
      name,
      icon: walletInfo.wallet.icon,
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

    const wallets = $wallets.get()

    if (wallets.some(w => w.type === "ios-webview")) {
      const walletInfo = wallets.find(w => w.wallet.name === name)

      if (!walletInfo || walletInfo.type !== "ios-webview") {
        throw new Error(
          `connect: failed to connect, requested wallet ${name} has not been hardcoded!`,
        )
      }

      const wallet = walletInfo.wallet
      if (!wallet.deepUrl) {
        window.open(wallet.url, "_blank")
        return
        // throw new Error(
        //   `connect: failed to connect, requested wallet ${name} does NOT have deeplink enabled!`,
        // )
      }

      const url = wallet.deepUrl(window.location)
      window.location.href = url
      return
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
    setLocalStorage(KEYS.WALLET_NAME, name)

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
    const walletInfo = $wallet.get()
    if (!walletInfo || walletInfo.type === "ios-webview") {
      console.error(
        "disconnect: resetting wallet since cannot disconnect from nonexistent adapter: ",
        walletInfo,
      )
      updateWallet()
      return
    }
    try {
      $disconnecting.set(true)
      const wallet = walletInfo.wallet
      if ("standard:disconnect" in wallet.features) {
        await wallet.features["standard:disconnect"].disconnect()
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
    const connectedWalletName = $wallet.get()?.wallet.name
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
      } else if (disconnectOnAccountChange) {
        onDisconnect(changes)
      }
      // } else if (props.disconnectOnAccountChange) {
      //   disconnect()
      // }
    }

    const walletInfos: WalletInfo[] = getStandardWallets().map(w => ({
      type: "standard",
      wallet: w,
    }))
    $wallets.set(walletInfos)
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
    console.log("detected connect event to wallet: ", event.detail.wallet)
    await select(event.detail.wallet)
  }

  async function disconnectHandler(_event: Event) {
    console.log("detected disconnect event ")
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
    const _wallets = [...get()]
    if (isIosAndWalletApp()) {
      if ("coinbaseSolana" in window) {
        const isCompatible = isWalletAdapterCompatibleStandardWallet(window.coinbaseSolana as any)
        alert(`coinbase solana compatible: ${isCompatible}`)
        _wallets.push(window.coinbaseSolana as any)
      }
    }
    const available = get().filter(w => isWalletAdapterCompatibleStandardWallet(w))
    return available
  }

  function onMountLoadStandardWallets() {
    console.log("onMountLoadWallets")

    const { on } = getWallets()
    const initializedWallets: WalletInfo[] = getStandardWallets().map(w => {
      w.features["standard:events"].on("change", async x => {
        console.log({ x })
        await onChange(w, x)
      })
      return { type: "standard", wallet: w }
    })

    console.log({ initializedWallets })

    /**
     * Store standard wallets initially available
     */
    $wallets.set(initializedWallets)
    const addWallet = () => {
      const walletInfos: WalletInfo[] = getStandardWallets().map(w => ({
        type: "standard",
        wallet: w,
      }))
      $wallets.set(walletInfos)
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

  function onMountLoadHardcodedMobileWallets() {
    const walletInfos: WalletInfo[] = HARDCODED_WALLET_STANDARDS.map(w => ({
      type: "ios-webview",
      wallet: w,
    }))
    $wallets.set(walletInfos)
  }

  async function select(name: string): Promise<void> {
    const existingName = $wallet.get()?.wallet.name

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
    const walletName = getLocalStorage<WalletName>(KEYS.WALLET_NAME)
    if (walletName) {
      await select(walletName)
    }
    // If IOS and within a wallet app
    // we automatically connect to the
    // first standard wallet
    if (isIosAndWalletApp()) {
      const wallets = $wallets.get()
      if (wallets.length == 0) {
        return
      }
      const first = $wallets.get()[0]
      if (!first) {
        return
      }
      await select(first.wallet.name)
    }
  }

  function initOnMount(): (() => void) | undefined {
    if (isIosAndRedirectable()) {
      alert("is ios!")
      onMountLoadHardcodedMobileWallets()
      return
    }

    // if (isIosAndWebView()) {
    //   alert("ios and web view found!")
    //   return
    // }

    // alert("init on mount!")

    const cleanup = onMountClearAdapterEventListeners()
    loadConnectHandlers()
    const cleanup2 = onMountLoadStandardWallets()
    onMountAutoConnect()
    return () => {
      cleanup()
      cleanup2()
      cleanupConnectHandlers()
    }
  }

  /**
   * Sign single transaction
   *
   * Only compatible with `@solana/web3.js@v1`
   */
  async function signTransactionV1(txBytes: Uint8Array) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("signTransaction failed, missing adapter/public key!")
    }

    if (walletInfo.type !== "standard") {
      throw new Error("solana:signTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
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

  /**
   * Sign multiple transactions
   *
   * Only compatible with `@solana/web3.js@v1`
   */
  async function signAllTransactionsV1(txs: Uint8Array[]) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("signAllTransactions failed, missing adapter/public key!")
    }

    if (walletInfo.type !== "standard") {
      throw new Error("solana:signTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
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

  /**
   * Sign arbitrary message
   *
   * Compatible with both `@solana/web3.js@v2` and `@solana/web3.js@v1`
   */
  async function signMessage(tx: Uint8Array): Promise<Uint8Array> {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("signMessage failed, missing adapter/public key!")
    }

    if (walletInfo.type !== "standard") {
      throw new Error("solana:signTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
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

  /*
   * Send transactions via `@solana/web3` v1 package
   */
  async function sendTransactionV1(txBytes: Uint8Array) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("sendTransaction failed: missing adapter / public key!")
    }

    if (walletInfo.type !== "standard") {
      throw new Error("solana:signAndSendTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
    if (!(SolanaSignAndSendTransaction in wallet.features)) {
      throw new Error("solana:signAndSendTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.account
    const input: SolanaSignAndSendTransactionInput = {
      account: acc,
      transaction: txBytes,
      chain: `solana:${$env.get()}`,
    }

    const feature = wallet.features[SolanaSignAndSendTransaction]
    const res = await feature.signAndSendTransaction(input)

    if (res.length === 0 || !res[0]) {
      throw new Error("Missing tx output from signAndSendTx from connected standard wallet!")
    }
    return res[0].signature
  }

  /**
   * Get a `TransactionSendingSigner` for signing transactions
   *
   * Only compatible with `@solana/web3.js@v2`
   *
   * @see https://github.com/solana-labs/solana-web3.js/blob/855c4e0998c58f500c7c950d51017fdccf8b61d6/packages/react/src/useSignAndSendTransaction.ts
   */
  function getTransactionSendingSigner(): TransactionSendingSigner | undefined {
    const connectedAccount = $connectedAccount.get()
    if (!connectedAccount) {
      return
    }

    const transactionSendingSigner: TransactionSendingSigner = {
      address: address(connectedAccount.pubKey),
      signAndSendTransactions: async (txs, config = {}) => {
        const { abortSignal, minContextSlot } = config
        abortSignal?.throwIfAborted()

        const walletInfo = $wallet.get()
        if (!walletInfo) {
          throw new Error("solana:signAndSendTransaction wallet not connected!")
        }

        if (walletInfo.type !== "standard") {
          throw new Error(
            "getTransactionSendingSigner NOT found since wallet is not standard wallet",
          )
        }

        const wallet = walletInfo.wallet
        if (!(SolanaSignAndSendTransaction in wallet.features)) {
          throw new Error("getTransactionSendingSigner NOT found in standard wallet features")
        }

        const [tx] = txs
        if (txs.length === 0) {
          throw new Error("No transactions found for signing")
        }
        if (!tx) {
          throw new Error("No transactions found for signing")
        }

        const acc = connectedAccount.account
        const transactionEncoder = getTransactionEncoder()
        const wireTxBytes = transactionEncoder.encode(tx)
        const input: SolanaSignAndSendTransactionInput = {
          account: acc,
          transaction: wireTxBytes as Uint8Array,
          chain: `solana:${$env.get()}`,
          ...(minContextSlot != null
            ? {
                options: {
                  minContextSlot: Number(minContextSlot),
                },
              }
            : null),
        }
        const feature = wallet.features[SolanaSignAndSendTransaction]
        const res = await feature.signAndSendTransaction(input)
        return res.map(s => s.signature as SignatureBytes)
      },
    }

    return transactionSendingSigner
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
    signTransactionV1,
    signAllTransactionsV1,
    sendTransactionV1,
    getTransactionSendingSigner,
  }
}

export type Store = ReturnType<typeof initStore>
// re-export types
export type { WalletName, WalletAdapterCompatibleStandardWallet }

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
