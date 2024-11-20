import { WalletAccount, type Wallet as StandardWallet } from "@wallet-standard/base"
import { atom, computed, onSet } from "nanostores"
import {
  isWalletAdapterCompatibleStandardWallet,
  WalletName,
  WalletAdapterCompatibleStandardWallet,
  BaseMessageSignerWalletAdapter,
  BaseSignerWalletAdapter,
  SendTransactionOptions,
  BaseSignInMessageSignerWalletAdapter,
} from "@solana/wallet-adapter-base"
import { SolanaSignMessage } from "@solana/wallet-standard-features"
import { getWallets } from "@wallet-standard/app"
import { base58 } from "@scure/base"
import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile"

import {
  dispatchAvailableWalletsChanged,
  dispatchConnecting,
  dispatchWalletChanged,
  StandardChangeEventProperties,
  ConnectEvent,
  WalletEvent,
  isConnectChangeEvent,
  isDisconnectChangeEvent,
} from "./events"
import { getLocalStorage, KEYS, setLocalStorage } from "./localstorage"
import { isIosAndRedirectable, isIosAndWalletApp } from "./environment"
import {
  THardcodedWalletStandardAdapter,
  HARDCODED_WALLET_STANDARDS,
  SolanaMobileWalletAdapterWalletName,
} from "./hardcoded-mobile"

export type Cluster = "devnet" | "testnet" | "mainnet-beta"
export type WalletStandardCluster = "devnet" | "testnet" | "mainnet"
export function convertToWalletStandardCluster(cluster: Cluster): WalletStandardCluster {
  if (cluster === "mainnet-beta") {
    return "mainnet"
  }
  return cluster
}

export type StoreProps = {
  env?: Cluster
  autoConnect: boolean
  disconnectOnAccountChange: boolean
  additionalWallets?: CustomWalletAdapter[] | undefined
  // TODO: allow custom configuration of this
  localStorageKey?: string
}

/*
 * Initial wallet info required for connecting
 */
export type WalletInfo =
  | { type: "ios-webview"; wallet: THardcodedWalletStandardAdapter }
  | { type: "standard"; wallet: WalletAdapterCompatibleStandardWallet }
  | { type: "custom"; wallet: CustomWalletAdapter }
  | { type: "mwa"; wallet: SolanaMobileWalletAdapter }

export type CustomWalletAdapter =
  | BaseSignerWalletAdapter
  | BaseMessageSignerWalletAdapter
  | BaseSignInMessageSignerWalletAdapter

/*
 * Wallet info of CONNECTED wallet
 */
export type AccountInfo =
  | {
      type: "standard"
      info: StandardWalletConnectResult
    }
  | {
      type: "custom"
      info: CustomWalletAdapter
    }
  | {
      type: "mwa"
      info: StandardWalletConnectResult
    }
/**
 * Wallet info of connected wallet-standard
 * compatible wallet
 */
export type StandardWalletConnectResult =
  | {
      pubKey: string
      name: string
      icon: string
      account: WalletAccount
    }
  | undefined

/**
 * Sets up all wallet related data, event listeners, etc
 * required for connecting/disconnecting to wallets
 *
 * This function should be run within a framework-specific
 * context when mounted on client side e.g.
 *
 * ```ts
 * // solidjs
 * onMount(() => {
 *   const cleanup = initStore();
 *   onCleanup(() => {
 *     cleanup();
 *   })
 * })
 *
 * // reactjs
 * useEffect(() => {
 *   const cleanup = initStore();
 *   return () => {
 *     cleanup();
 *   }
 * }, [])
 * ```
 */
export function initStore({ env, disconnectOnAccountChange, additionalWallets = [] }: StoreProps) {
  const $walletsMap = atom<Record<string, WalletInfo>>(
    generateWalletMap(additionalWallets?.map(w => ({ type: "custom", wallet: w }))),
  )
  onSet($walletsMap, async ({ newValue }) => {
    console.log("wallets map changed: ", { newWallets: newValue })

    dispatchAvailableWalletsChanged({ wallets: Object.values(newValue) })

    // Skip auto-connect since already connected
    const connected = $isConnected.get()
    const connecting = $connecting.get()
    if (connected || connecting) {
      console.error("wallets map changed: not auto connecting since already connected/connecting")
      return
    }

    // Automatically attempt to connect to
    // last connected wallet if last wallet
    // wasn't intentionally disconnected
    const walletName = getLocalStorage<WalletName>(KEYS.WALLET_NAME)
    if (walletName) {
      await connect(walletName)
    }
  })

  const $wallets = computed($walletsMap, walletsMap => {
    return Object.values(walletsMap)
  })

  const $connectedAccount = atom<AccountInfo | undefined>()
  onSet($connectedAccount, ({ newValue }) => {
    dispatchWalletChanged({ wallet: newValue })
  })
  const $isConnected = computed($connectedAccount, acc => !!acc)

  const $wallet = computed([$connectedAccount, $walletsMap], (acc, walletsMap) => {
    if (!acc || !acc.info) {
      return
    }
    return walletsMap[acc.info.name]
  })

  const $env = atom<Cluster>(env ?? "mainnet-beta")
  onSet($env, ({ newValue }) => {
    console.log("new env value: ", { newValue })
  })

  const $connecting = atom<boolean>(false)
  onSet($connecting, ({ newValue }) => {
    dispatchConnecting({ connecting: newValue })
  })

  const $disconnecting = atom<boolean>(false)

  function onConnect(
    event: StandardChangeEventProperties,
    wallet: WalletAdapterCompatibleStandardWallet,
  ) {
    if (!isConnectChangeEvent(event)) {
      return
    }
    const account = event.accounts[0]
    if (!account) {
      console.error("onConnect: THIS CHECK SHOULD NEVER OCCUR")
      return
    }
    const newWallet: AccountInfo = {
      type: "standard",
      info: {
        name: wallet.name,
        icon: wallet.icon,
        account,
        pubKey: base58.encode(account.publicKey),
      },
    }
    $connectedAccount.set(newWallet)
  }

  function onDisconnect(event: StandardChangeEventProperties) {
    if (!isDisconnectChangeEvent(event)) {
      return
    }
    updateWallet()
  }

  function updateChangeEventListeners(walletInfo?: WalletInfo): void {
    walletInfo = walletInfo ? walletInfo : $wallet.get()
    if (walletInfo && walletInfo.type === "standard") {
      walletInfo.wallet.features["standard:events"].on("change", e =>
        onChange(walletInfo.wallet, e),
      )
    }
  }

  /**
   * @throws Error
   */
  async function connectStandardWallet(name: string): Promise<AccountInfo> {
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
      type: "standard",
      info: {
        name,
        icon: walletInfo.wallet.icon,
        account: acc,
        pubKey: base58.encode(acc.publicKey),
      },
    }
  }

  async function connectCustomWallet(name: string): Promise<AccountInfo | undefined> {
    const walletInfo = $walletsMap.get()[name]
    if (!walletInfo || walletInfo.type !== "custom") {
      console.error("connectCustomWallet: failed, missing/invalid walletInfo: ", { walletInfo })
      return
    }

    const wallet = walletInfo.wallet
    await wallet.connect()

    return {
      type: "custom",
      info: wallet,
    }
  }

  async function connectMwa(name: string): Promise<AccountInfo | undefined> {
    if (name !== SolanaMobileWalletAdapterWalletName) {
      throw new Error(`connectMwa: wallet with name: ${name} is not mobile wallet adapter!`)
    }

    const walletInfo = $walletsMap.get()[name]
    if (!walletInfo || walletInfo.type !== "mwa") {
      console.error("connectMwa: failed, missing/invalid walletInfo: ", { walletInfo })
      return
    }
    const res = await walletInfo.wallet.signIn()
    alert(`mwa wallet sign in res: ${JSON.stringify(res)}`)
    return {
      type: "mwa",
      info: {
        name: walletInfo.wallet.name,
        icon: walletInfo.wallet.icon,
        account: res.account,
        pubKey: base58.encode(res.account.publicKey),
      },
    }
  }

  async function updateWallet(name?: string | undefined) {
    setLocalStorage(KEYS.WALLET_NAME, name)

    if (!name) {
      $connectedAccount.set(undefined)
      return
    }

    /**
     * Update connect/disconnect event listeners
     * to track newly connected wallet
     */
    updateChangeEventListeners()

    if ($connecting.get() || $disconnecting.get()) {
      throw new Error("connect: failed to connect, already connecting/disconnecting")
    }

    const wallets = $wallets.get()

    /**
     * Connecting to a mobile wallet on IOS means
     * redirecting the user via deep-links to their
     * respective mobile apps where the current site
     * will be launched in a webview within the app
     *
     * @see https://docs.phantom.app/phantom-deeplinks/other-methods/browse
     */
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

    const walletInfo = wallets.find(w => w.wallet.name === name)
    if (!walletInfo || walletInfo.type === "ios-webview") {
      throw new Error(`updateWallet: cannot connect to wallet '${name}', no wallet info found!`)
    }

    try {
      $connecting.set(true)
      dispatchConnecting({ connecting: true })
      const res =
        walletInfo.type === "custom"
          ? await connectCustomWallet(name)
          : walletInfo.type === "mwa"
            ? await connectMwa(name)
            : await connectStandardWallet(name)

      console.error("connectWallet: connect result: ", { res })
      if (!res) {
        throw new Error("connect: failed to connect, missing response after connecting wallet")
      }
      $connectedAccount.set(res)
    } catch (error: unknown) {
      console.error("failed to connect, error occurred connecting: ", { error })
      alert(`failed to connect to ${name}, error: ${JSON.stringify(error)}`)
      updateWallet()
    } finally {
      $connecting.set(false)
      dispatchConnecting({ connecting: false })
    }
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
      if (walletInfo.type == "custom" || walletInfo.type === "mwa") {
        await walletInfo.wallet.disconnect()
      } else {
        const wallet = walletInfo.wallet
        if ("standard:disconnect" in wallet.features) {
          await wallet.features["standard:disconnect"].disconnect()
        }
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
  async function onChange(
    wallet: WalletAdapterCompatibleStandardWallet,
    changes: StandardChangeEventProperties,
  ) {
    console.log("standard event change captured: ", {
      name: wallet.name,
      accounts: changes.accounts,
    })
    const connectedWalletName = $wallet.get()?.wallet.name
    if (!connectedWalletName || connectedWalletName !== wallet.name) {
      return
    }
    /**
     * w.accounts is empty ONLY IF
     *  1. a disconnect event occurred
     *  2. user switched wallet account BUT this particular
     * wallet does NOT allow automatic connection to other
     * accounts without explicit user permission e.g
     * auto-connect not checked (Solflare)
     *
     * if (2) occurs, we disconnect from the wallet to
     * reflect the wallet's rejection of the account change
     */
    const acc = changes.accounts && changes.accounts[0]
    console.log("standard wallet change detected: ", { changes })

    if (!acc) {
      onDisconnect(changes)
      return
    }

    onConnect(changes, {
      name: wallet.name,
      accounts: wallet.accounts,
      icon: wallet.icon,
      chains: wallet.chains,
      version: wallet.version,
      features: wallet.features as any,
    })

    // TODO: check if this step is necessary
    const walletInfos: WalletInfo[] = getStandardWallets().map(w => ({
      type: "standard",
      wallet: w,
    }))
    $walletsMap.set(generateWalletMap([...$wallets.get(), ...walletInfos]))
  }

  // function onChangeEvent(
  //   changeProperties: StandardChangeEventProperties,
  //   wallet: WalletAdapterCompatibleStandardWallet,
  // ) {
  //   console.log("onChangeEvent called: ", { changeProperties, wallet })
  //
  //   if (isConnectChangeEvent(changeProperties)) {
  //     onConnect(changeProperties, wallet)
  //   }
  //
  //   if (isDisconnectChangeEvent(changeProperties)) {
  //     onDisconnect(changeProperties)
  //   }
  // }

  /**
   * Invalidate adapter listeners before refreshing the page
   */
  function onMountUpdateChangeEventListeners() {
    console.log("onMountClearAdapterEventListeners")
    window.addEventListener("beforeunload", () => updateChangeEventListeners())
    return () => {
      window.removeEventListener("beforeunload", () => updateChangeEventListeners())
    }
  }

  async function connectHandler(_event: Event) {
    const event = _event as ConnectEvent
    console.log("detected connect event to wallet: ", event.detail.wallet)
    await connect(event.detail.wallet)
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
    const available = get().filter(w => isWalletAdapterCompatibleStandardWallet(w))
    return available
  }

  function getStandardWalletInfos(): WalletInfo[] {
    const standardWallets = getStandardWallets()
    const walletInfos: WalletInfo[] = standardWallets.map(w => ({
      type: "standard",
      wallet: w,
    }))
    return walletInfos
  }

  function onMountLoadStandardWallets() {
    const initialWallets: WalletInfo[] = getStandardWalletInfos()

    initialWallets.forEach(walletInfo => {
      if (walletInfo.type !== "standard") {
        return
      }
      walletInfo.wallet.features["standard:events"].on("change", async changes => {
        console.log({ changes })
        await onChange(walletInfo.wallet, changes)
      })
    })

    /**
     * Store standard wallets initially available
     */
    $walletsMap.set(generateWalletMap([...$wallets.get(), ...initialWallets]))

    const addWallet = () => {
      console.log("addWallet: triggered by on('register') event")
      const walletInfos = getStandardWalletInfos()
      const existingWallets = $wallets.get()
      const existingWalletNames = existingWallets.map(w => w.wallet.name)
      const newWalletInfos = walletInfos.filter(w => !existingWalletNames.includes(w.wallet.name))

      newWalletInfos.forEach(walletInfo => {
        if (walletInfo.type !== "standard") {
          return
        }
        walletInfo.wallet.features["standard:events"].on("change", async changes => {
          console.log({ changes })
          await onChange(walletInfo.wallet, changes)
        })
      })

      $walletsMap.set(generateWalletMap([...existingWallets, ...newWalletInfos]))
    }

    /**
     * Add listeners for standard wallets registered
     * AFTER initial `get` call
     */
    const { on } = getWallets()
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
    $walletsMap.set(generateWalletMap(walletInfos))
  }

  function availableWalletsHandler() {
    const wallets = Object.values($walletsMap.get())
    dispatchAvailableWalletsChanged({ wallets })
  }

  function loadAvailableWalletsHandler() {
    window.addEventListener(WalletEvent.GET_AVAILABLE_WALLETS, availableWalletsHandler)
  }

  function cleanupAvailableWalletsHandler() {
    window.removeEventListener(WalletEvent.GET_AVAILABLE_WALLETS, availableWalletsHandler)
  }

  async function connect(name: string): Promise<void> {
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
    if (!isIosAndWalletApp()) {
      return
    }
    // If IOS and within a wallet app
    // we automatically connect to the
    // first standard wallet
    const standard = $wallets.get().find(w => w.type === "standard")
    if (!standard) {
      return
    }
    await connect(standard.wallet.name)
  }

  function initOnMount(): (() => void) | undefined {
    // Automatically load hardcoded IOS app
    // deep-link redirects if on IOS browser
    if (isIosAndRedirectable()) {
      onMountLoadHardcodedMobileWallets()
      return
    }

    // TODO: add automatic connection to coinbase
    // wallet within IOS app
    // if ("coinbaseSolana" in window) {
    //   const walletInfo: WalletInfo = {
    //     type: "coinbase",
    //     wallet: new CoinbaseWalletAdapter(),
    //   }
    //   $walletsMap.set(generateWalletMap([walletInfo]))
    //
    //   if (isIosAndWalletApp()) {
    //     connect(walletInfo.wallet.name)
    //     return
    //   }
    // }

    // Automatically fetch wallet-standard
    // compatible wallet extensions/mobile apps
    const cleanup = onMountUpdateChangeEventListeners()
    loadConnectHandlers()
    const cleanup2 = onMountLoadStandardWallets()
    onMountAutoConnect()
    loadAvailableWalletsHandler()
    return () => {
      cleanup()
      cleanup2()
      cleanupConnectHandlers()
      cleanupAvailableWalletsHandler()
    }
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

    if (walletInfo.type === "ios-webview") {
      throw new Error("solana:signMessage NOT found since wallet is not standard wallet")
    }

    if (connectedAccount.type === "custom") {
      if (!("signMessage" in connectedAccount.info)) {
        throw new Error("solana:signMessage NOT supported by custom wallet")
      }
      const res = await connectedAccount.info.signMessage(tx)
      return res
    }

    const acc = connectedAccount.info?.account
    if (!acc) {
      throw new Error("solana:signMessage NOT found in standard wallet features")
    }

    if (walletInfo.type === "mwa") {
      alert(`${JSON.stringify(acc.features)}`)
      throw new Error("sign message NOT implemented on mwa YET")
    }

    if (walletInfo.type !== "standard") {
      throw new Error("solana:signMessage NOT found in custom wallet features")
    }
    if (!(SolanaSignMessage in walletInfo.wallet.features)) {
      throw new Error("solana:signMessage NOT found in standard wallet features")
    }

    const feature = walletInfo.wallet.features[SolanaSignMessage]
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
    // signTransaction,
    // signAllTransactions,
    // sendTransaction,
  }
}

// re-export types
export type Store = ReturnType<typeof initStore>
export type {
  WalletName,
  WalletAdapterCompatibleStandardWallet,
  BaseSignerWalletAdapter,
  BaseMessageSignerWalletAdapter,
  SendTransactionOptions,
}
// export * from "./coinbase"

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
//

export function generateWalletMap(wallets: WalletInfo[]): Record<string, WalletInfo> {
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
}
