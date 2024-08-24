import {
  Adapter,
  isWalletAdapterCompatibleStandardWallet,
  SendTransactionOptions,
  WalletAdapter,
  WalletError,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  WalletSendTransactionError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base"
import { type Wallet as StandardWallet } from "@wallet-standard/base"
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
  Cluster,
} from "@solana/web3.js"
import { createSignal, onMount, createMemo, onCleanup, createEffect, on, batch } from "solid-js"
import { createStore } from "solid-js/store"
import { createContextProvider } from "@solid-primitives/context"
import { getWallets } from "@wallet-standard/app"
import {
  SolanaMobileWalletAdapterWalletName,
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultWalletNotFoundHandler,
  createDefaultAuthorizationResultCache,
} from "@solana-mobile/wallet-adapter-mobile"
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base"
import type { WalletWithStandardFeatures, EventsChangeProperties } from "@wallet-standard/features"
import bs58 from "bs58"
import {
  SolanaSignAndSendTransaction,
  SolanaSignAndSendTransactionInput,
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignTransactionInput,
} from "@solana/wallet-standard-features"
import type { WalletAccount } from "@wallet-standard/core"

import { getLocalStorage, setLocalStorage } from "./localstorage"
import { detectedFirst, isInWebView, isIosAndWebView, isOnAndroid } from "./utils"

export type Wallet = {
  adapter: Adapter
  readyState: WalletReadyState
}

export type ErrorHandler = (error: WalletError) => void
export type WalletPropsConfig = {
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  disconnectOnAccountChange: boolean
  localStorageKey: string
  wallets: Adapter[]
}
export type WalletProviderProps = {
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  disconnectOnAccountChange: boolean
  wallets: Wallet[]
  env?: Cluster
  localStorageKey: string
}

const [WalletProvider, _useWallet] = createContextProvider((props: WalletProviderProps) => {
  // All wallet info
  const { get } = getWallets()

  const [standardWallets, setStandardWallets] = createSignal<StandardWallet[]>([])
  const [wallets, setWallets] = createStore<Wallet[]>(props.wallets ?? [])
  const walletsByName = createMemo<Record<WalletName, Adapter>>(prev => {
    return wallets.reduce<Record<WalletName, Adapter>>((_walletsByName, newWallet) => {
      const existing = _walletsByName[newWallet.adapter.name]
      // Add wallet adapter if not yet added
      if (!existing) {
        _walletsByName[newWallet.adapter.name] = newWallet.adapter
        return _walletsByName
      }
      // Don't update existing custom wallet adapters
      if (!(existing instanceof StandardWalletAdapter)) {
        return _walletsByName
      }
      // ALWAYS update standard wallet adapter, we assume
      // that any
      if (newWallet instanceof StandardWalletAdapter) {
        _walletsByName[newWallet.adapter.name] = newWallet.adapter
        return _walletsByName
      }
      return _walletsByName
    }, prev ?? {})
  })

  const [publicKey, setPublicKey] = createSignal<PublicKey | undefined>()
  const connected = createMemo<boolean>(() => !!publicKey())
  const [account, setAccount] = createSignal<WalletAccount | undefined>()

  const [adapter, setAdapter] = createSignal<Adapter | undefined>()
  const name = createMemo<WalletName | undefined>(() => {
    return adapter()?.name
  })

  // Selected wallet connection state
  const [env] = createSignal<Cluster>(props.env ?? "mainnet-beta")
  const [connecting, setConnecting] = createSignal<boolean>(false)
  const [disconnecting, setDisconnecting] = createSignal<boolean>(false)
  const [ready, setReady] = createSignal<WalletReadyState>(WalletReadyState.Unsupported)

  const autoConnect = createMemo(() => props.autoConnect ?? false)
  function shouldAutoConnect(): boolean {
    const _adapter = adapter()
    const _autoConnect = autoConnect()
    const adapterAutoConnect =
      _adapter && typeof _autoConnect === "function"
        ? _autoConnect(_adapter)
        : (_autoConnect as boolean)
    const _ready = ready()
    const connectableState =
      _ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable
    return adapterAutoConnect && !!_adapter && !publicKey() && !connecting() && connectableState
  }

  function onConnect(newKey: PublicKey) {
    setPublicKey(newKey)
  }

  function onDisconnect() {
    resetWallet()
  }

  function removeAdapterEventListeners(_adapter?: Adapter | undefined): void {
    _adapter = _adapter ? _adapter : adapter()
    if (_adapter) {
      _adapter.off("connect", onConnect)
      _adapter.off("disconnect", onDisconnect)
    }
  }

  function resetWallet() {
    updateWallet(undefined)
  }

  async function updateWallet(newAdapter: Adapter | undefined) {
    setLocalStorage(props.localStorageKey, newAdapter?.name)

    if (!newAdapter) {
      batch(() => {
        setReady(WalletReadyState.NotDetected)
        setPublicKey()
        setAdapter()
      })
      return
    }

    /**
     * Update connect/disconnect event listeners
     * to track newly connected wallet
     */
    removeAdapterEventListeners()
    newAdapter.on("connect", onConnect)
    newAdapter.on("disconnect", onDisconnect)

    batch(() => {
      setReady(WalletReadyState.Loadable)
      setAdapter(newAdapter)
    })

    const autoConnect = shouldAutoConnect()
    console.log({ autoConnect })
    if (autoConnect) {
      await connect(newAdapter)
    }
  }

  async function select(newAdapter: Adapter): Promise<void> {
    const newName = newAdapter.name
    const existingName = name()

    if (existingName === newName) {
      console.error("adapter already connected")
      return
    }

    const _adapter = adapter()
    if (_adapter) {
      console.error("another wallet connected, disconnecting: ", { _adapter })
      await disconnect()
    }

    updateWallet(newAdapter)
  }

  type StandardWalletConnectResult =
    | {
        type: "standard"
        pubKey: PublicKey
        account: WalletAccount
      }
    | undefined

  async function connectStandardWallet(
    wallet: WalletWithStandardFeatures,
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
      pubKey: new PublicKey(acc.publicKey),
      account: acc,
    }
  }

  type CustomWalletConnectResult =
    | {
        type: "custom"
        pubKey: PublicKey
      }
    | undefined

  async function connectCustomWallet(adapter: Adapter): Promise<CustomWalletConnectResult> {
    await adapter.connect()
    const pubKey = adapter.publicKey
    if (!pubKey) {
      return
    }
    return {
      type: "custom",
      pubKey,
    }
  }

  async function connect(adapter: Adapter): Promise<void> {
    if (connecting() || disconnecting()) {
      console.error("failed to connect, currently connecting/disconnecting")
      return
    }
    const _ready = ready()

    if (!(_ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable)) {
      console.error("failed to connect, invalid ready state (not installed/loadable)")
      resetWallet()
      if (typeof window !== "undefined") {
        window.open(adapter.url, "_blank")
      }
      throw new WalletNotReadyError()
    }

    try {
      setConnecting(true)
      const res =
        adapter instanceof StandardWalletAdapter
          ? await connectStandardWallet(adapter.wallet)
          : await connectCustomWallet(adapter)
      if (!res) {
        console.error("failed to connect, missing response after connecting wallet")
        return
      }
      if (res.type === "custom") {
        setPublicKey(res.pubKey)
      } else if (res.type === "standard") {
        setPublicKey(res.pubKey)
        setAccount(res.account)
      }
    } catch (error: unknown) {
      console.error("failed to connect, error occurred connecting: ", { error })
      resetWallet()
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect(): Promise<void> {
    if (disconnecting()) {
      return
    }
    const _adapter = adapter()
    if (!_adapter) {
      console.error(
        "disconnect: resetting wallet since cannot disconnect from nonexistent adapter: ",
        _adapter,
      )
      resetWallet()
      return
    }
    try {
      setDisconnecting(true)
      await _adapter.disconnect()
    } finally {
      console.log("adapter, pubkey after disconnect: ", { adapter: adapter(), pubKey: publicKey() })
      batch(() => {
        setDisconnecting(false)
        setPublicKey()
        resetWallet()
      })
    }
  }

  async function signTransaction<T extends Transaction | VersionedTransaction>(tx: T) {
    const _pubKey = publicKey()
    const _adapter = adapter()
    if (!_adapter || !_pubKey) {
      throw new WalletNotConnectedError("signTransaction failed, missing adapter/public key!")
    }

    if (!(_adapter instanceof StandardWalletAdapter)) {
      if (!("signTransaction" in _adapter)) {
        throw new WalletSignTransactionError(
          "signTransaction failed, `signTransaction` method not found in custom adapter",
        )
      }
      const res = await _adapter.signTransaction(tx)
      return res
    }

    const acc = account()
    if (!acc) {
      throw new WalletNotConnectedError(
        "signTransaction failed, missing account! (standard wallet adapter requires an account to sign transactions)",
      )
    }

    if (!(SolanaSignTransaction in _adapter.wallet.features)) {
      throw new WalletSignTransactionError(
        "solana:signTransaction NOT found in standard wallet features",
      )
    }

    const feature = _adapter.wallet.features[SolanaSignTransaction]
    const input: SolanaSignTransactionInput = {
      account: acc,
      transaction: tx.serialize({ verifySignatures: false }),
    }

    const res = await feature.signTransaction(input)
    if (res.length === 0 || !res[0]) {
      throw new WalletSignTransactionError("failed to sign tx, missing sign tx output")
    }
    return res[0].signedTransaction
  }

  async function signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]) {
    const _pubKey = publicKey()
    const _adapter = adapter()
    if (!_adapter || !_pubKey) {
      throw new WalletNotConnectedError("signAllTransactions failed, missing adapter/public key!")
    }

    if (!(_adapter instanceof StandardWalletAdapter)) {
      if (!("signAllTransactions" in _adapter)) {
        throw new WalletSignTransactionError(
          "signAllTransactions failed, `signAllTransactions` method not found in custom adapter",
        )
      }
      const res = await _adapter.signAllTransactions(txs)
      return res
    }

    const acc = account()
    if (!acc) {
      throw new WalletNotConnectedError(
        "signAllTransactions failed, missing account! (standard wallet adapter requires an account to sign transactions)",
      )
    }

    if (!(SolanaSignTransaction in _adapter.wallet.features)) {
      throw new WalletSignTransactionError(
        "solana:signTransaction NOT found in standard wallet features",
      )
    }

    const feature = _adapter.wallet.features[SolanaSignTransaction]
    const inputs: SolanaSignTransactionInput[] = txs.map(tx => ({
      account: acc,
      transaction: tx.serialize({ verifySignatures: false }),
    }))
    const res = await feature.signTransaction(...inputs)
    if (res.length === 0 || !res[0]) {
      throw new WalletSignTransactionError(
        "solana:signTransaction failed, missing sign all txs output",
      )
    }
    return res[0].signedTransaction
  }

  async function signMessage(tx: Uint8Array): Promise<Uint8Array> {
    const _publicKey = publicKey()
    const _adapter = adapter()
    if (!_adapter || !_publicKey) {
      throw new WalletNotConnectedError("signMessage failed, missing adapter/public key!")
    }
    if (!(_adapter instanceof StandardWalletAdapter)) {
      if (!("signMessage" in _adapter)) {
        throw new WalletSignMessageError(
          "signMessage failed, `signMessage` method not found in custom adapter",
        )
      }
      const res = await _adapter.signMessage(tx)
      return res
    }
    const acc = account()
    if (!acc) {
      throw new WalletNotConnectedError(
        "signMessage failed, missing account! (standard wallet adapter requires an account to sign messages)",
      )
    }

    if (!(SolanaSignMessage in _adapter.wallet.features)) {
      throw new WalletSignMessageError("solana:signMessage NOT found in standard wallet features")
    }

    const feature = _adapter.wallet.features[SolanaSignMessage]
    const res = await feature.signMessage({
      account: acc,
      message: tx,
    })
    const firstRes = res[0]
    if (!firstRes) {
      throw new WalletSignMessageError("failed to sign message, missing sign message output")
    }
    return firstRes.signature
  }

  async function sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ): Promise<TransactionSignature> {
    const _publicKey = publicKey()
    const _adapter = adapter()
    if (!_adapter || !_publicKey) {
      throw new WalletNotConnectedError("sendTransaction failed: missing adapter / public key!")
    }
    if (!(_adapter instanceof StandardWalletAdapter)) {
      if (!("sendTransaction" in _adapter)) {
        throw new WalletSendTransactionError(
          "sendTransaction failed, `sendTransaction` method not found in adapter",
        )
      }
      const res = await _adapter.sendTransaction(transaction, connection, options)
      return res
    }

    const acc = account()
    if (!acc) {
      throw new WalletNotConnectedError(
        "sendTransaction failed, missing account! (standard wallet adapter requires an account to send transaction)",
      )
    }

    if (!(SolanaSignAndSendTransaction in _adapter.wallet.features)) {
      throw new WalletSignMessageError(
        "solana:signAndSendTransaction NOT found in standard wallet features",
      )
    }

    const latestHash = await connection.getLatestBlockhash("finalized")
    if (transaction instanceof Transaction) {
      transaction.recentBlockhash = latestHash.blockhash
      transaction.feePayer = new PublicKey(acc.publicKey)
    }
    const input: SolanaSignAndSendTransactionInput = {
      account: acc,
      transaction: transaction.serialize({ verifySignatures: false }),
      chain: "solana:devnet",
    }

    const feature = _adapter.wallet.features[SolanaSignAndSendTransaction]
    const res = await feature.signAndSendTransaction(input)

    if (res.length === 0 || !res[0]) {
      throw new Error("Missing tx output from signAndSendTx from connected standard wallet!")
    }
    return bs58.encode(res[0].signature)
  }

  function getMobileWallet(wallets: Adapter[]) {
    /**
     * Return null if Mobile wallet adapter is already in the list or if ReadyState is Installed.
     *
     * There are only two ways a browser extension adapter should be able to reach `Installed` status:
     *   1. Its browser extension is installed.
     *   2. The app is running on a mobile wallet's in-app browser.
     * In either case, we consider the environment to be desktop-like and not 'mobile'.
     */
    if (
      wallets.some(
        ({ name, readyState }) =>
          name === SolanaMobileWalletAdapterWalletName || readyState === WalletReadyState.Installed,
      )
    ) {
      return null
    }

    const ua = globalThis.navigator?.userAgent ?? null

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
    if (ua && isOnAndroid(ua) && !isInWebView(ua)) {
      const mobileWalletAdapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          uri: getUriForAppIdentity(),
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: env(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      })

      console.log(
        "adding new solana mobile wallet adapter! (mobile + android + not webview): ",
        mobileWalletAdapter,
      )
      return mobileWalletAdapter
    }
  }

  /** Get installed wallets compatible with the standard
   * and adds them to pre-added list of wallets
   */
  async function updateWallets(ws: StandardWallet[]) {
    const standards: WalletAdapter[] = ws
      .map(w => ({
        name: w.name,
        version: w.version,
        chains: w.chains,
        icon: w.icon,
        features: w.features,
        accounts: w.accounts.map(a => ({
          address: a.address,
          features: a.features,
          icon: a.icon,
          /**
           * IMPORTANT: directly copy `ReadonlyUint8Array` via reference
           * because wallet sign functions like `signMessage`, etc
           * will fail if the publicKey is referentially different
           * a.k.a public key MUST BE copied via reference
           */
          publicKey: a.publicKey,
          chains: a.chains,
        })),
      }))
      // select wallets compatible with the Wallet Standard
      .filter(w => isWalletAdapterCompatibleStandardWallet(w))
      .filter(w => {
        const existing = wallets.find(ew => ew.adapter.name === w.name)
        const existingCustom = existing instanceof StandardWalletAdapter
        return !existingCustom
      })
      // wrap as `StandardWalletAdapter`
      .map(wallet => {
        const standard = new StandardWalletAdapter({
          wallet: {
            name: wallet.name,
            features: wallet.features,
            accounts: wallet.accounts,
            icon: wallet.icon,
            chains: wallet.chains,
            version: wallet.version,
          },
        })
        return standard
      })

    const existingCustomWallets = wallets.filter(
      w => !standards.find(s => s.name === w.adapter.name),
    )
    const allWallets = [...standards, ...existingCustomWallets.map(w => w.adapter)]

    // merge standard mobile wallet if available
    const mobileWallet = getMobileWallet(allWallets)
    if (mobileWallet) {
      allWallets.unshift(mobileWallet)
    }

    if (isIosAndWebView() && !adapter()) {
      const first = standards[0]
      if (first) {
        await select(first)
      }
      alert(`coinbaseSolana: ${JSON.stringify((window as any).coinbaseSolana)}`)
      if ("coinbaseSolana" in window) {
        const coinbaseAdapter = allWallets.find(w => w.name === "Coinbase Wallet")
        if (coinbaseAdapter) {
          await select(coinbaseAdapter)
        }
      }
    }

    // sort 'Installed' wallets first and 'Loadable' next
    const installedFirst = (a: Adapter, b: Adapter) =>
      detectedFirst(WalletReadyState.Installed, a, b)
    const loadableFirst = (a: Adapter, b: Adapter) => detectedFirst(WalletReadyState.Loadable, a, b)
    allWallets.sort(loadableFirst).sort(installedFirst)

    const newWallets: Wallet[] = allWallets.map(w => ({ adapter: w, readyState: w.readyState }))
    setWallets(newWallets)
  }

  /**
   * Invalidate adapter listeners before refreshing the page
   */
  onMount(() => {
    window.addEventListener("beforeunload", () => removeAdapterEventListeners())
    onCleanup(() => {
      window.removeEventListener("beforeunload", () => removeAdapterEventListeners())
    })
  })

  /**
   * Update standard wallet connected account + public key
   * when change event detected
   */
  async function onChange(w: StandardWallet, changes: EventsChangeProperties) {
    console.log("standard event change captured: ", {
      name: w.name,
      accounts: changes.accounts,
    })
    const connectedWalletName = name()
    batch(() => {
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
          setAccount(acc)
          setPublicKey(new PublicKey(acc.publicKey))
        } else if (props.disconnectOnAccountChange) {
          disconnect()
        }
      }
      setStandardWallets([...get()])
    })
  }

  /** Add ready state change listeners for all wallets,
   * wallet state should update regardless of whether
   * any wallet is currently connected
   */
  function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
    // setReady(_adapter.readyState)
    // When the wallets change, start to listen for changes to their `readyState`
    setWallets(ws => ws.adapter.name === this.name, { adapter: this, readyState })
  }

  onMount(async () => {
    const { on } = getWallets()

    const initializedWallets = get().map((w, i) => {
      console.log(`raw wallet ${i + 1}: `, w)
      // @ts-ignore
      if (isWalletAdapterCompatibleStandardWallet(w)) {
        if (w.features["standard:events"]) {
          w.features["standard:events"].on("change", async x => {
            console.log({ x })
            await onChange(w, x)
          })
        }
      }
      return w
    })

    /**
     * Store standard wallets initially available
     */
    setStandardWallets(initializedWallets)
    const addWallet = () => {
      setStandardWallets([...get()])
    }

    /**
     * Add listeners for standard wallets registered
     * AFTER initial `get` call
     */
    const removeRegisterListener = on("register", addWallet)
    const removeUnregisterListener = on("unregister", addWallet)
    onCleanup(() => {
      removeRegisterListener()
      removeUnregisterListener()
    })
  })

  createEffect(
    on(standardWallets, async ws => {
      const filtered: StandardWallet[] = ws
        .filter(w => !!w.features)
        .filter(w =>
          isWalletAdapterCompatibleStandardWallet({
            ...w,
            name: w.name,
            icon: w.icon,
            chains: w.chains,
            version: w.version,
            features: w.features,
            accounts: w.accounts.map(a => ({
              chains: a.chains,
              features: a.features,
              label: a.label,
              icon: a.icon,
              address: a.address,
              publicKey: a.publicKey,
            })),
          }),
        )

      updateWallets(filtered)
    }),
  )

  /**
   * Add handlers for updating wallet ready states
   */
  onMount(() => {
    wallets.forEach(({ adapter }) => {
      adapter.on("readyStateChange", onReadyStateChange, adapter)
    })
    onCleanup(() => {
      wallets.forEach(({ adapter }) => {
        adapter.off("readyStateChange", onReadyStateChange, adapter)
      })
    })
  })

  /*
   * Automatically connect to most recently connected wallet
   */
  onMount(async () => {
    const walletName = getLocalStorage<WalletName>(props.localStorageKey)
    if (!walletName) {
      return
    }
    const adapter = walletsByName()[walletName]
    if (!adapter) {
      return
    }
    await select(adapter)
  })

  return {
    env,
    name,
    publicKey,
    connected,
    connecting,
    disconnecting,
    localStorageKey: props.localStorageKey,
    ready,
    adapter,
    wallets,
    walletsByName,

    signTransaction,
    signMessage,
    signAllTransactions,
    sendTransaction,

    autoConnect,
    connect,
    disconnect,
    select,
  }
})

const useWallet = () => {
  const context = _useWallet()
  if (!context) {
    throw new Error("useWalelt must be used within a WalletProvider")
  }
  return context
}

export { WalletProvider, useWallet }
