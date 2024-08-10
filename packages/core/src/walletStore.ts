import type {
  Adapter,
  MessageSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
  SendTransactionOptions,
  SignerWalletAdapter,
  SignerWalletAdapterProps,
  WalletError,
  WalletName,
} from "@solana/wallet-adapter-base"
import {
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
} from "@solana/wallet-adapter-base"
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js"
import { getLocalStorage, setLocalStorage } from "./localstorage"
import { batch, createSignal, Accessor, onMount, createMemo, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { createContextProvider } from "@solid-primitives/context"

export type Wallet = {
  adapter: Adapter
  readyState: WalletReadyState
}

export type ErrorHandler = (error: WalletError) => void
export type WalletPropsConfig = Pick<WalletContext, "autoConnect"> & {
  localStorageKey: string
  wallets: Adapter[]
}
export type WalletReturnConfig = Pick<WalletContext, "wallets" | "autoConnect"> & {
  localStorageKey: string
}

export type WalletStatus = Pick<WalletContext, "connected" | "publicKey">

// props
type WalletProviderProps = Pick<WalletContext, "autoConnect" | "wallets">

export type WalletContext = {
  // props
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  wallets: Wallet[]

  // wallet state
  adapter: Accessor<Adapter | undefined>
  connected: Accessor<boolean>
  connecting: Accessor<boolean>
  disconnecting: Accessor<boolean>
  localStorageKey: Accessor<string>
  publicKey: Accessor<PublicKey | undefined>
  ready: Accessor<WalletReadyState>
  walletsByName: Record<WalletName, Adapter>
  name: Accessor<WalletName | undefined>

  // wallet methods
  connect(): Promise<void>
  disconnect(): Promise<void>
  select(walletName: WalletName): void
  sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ): Promise<TransactionSignature>
  signAllTransactions: Accessor<SignerWalletAdapterProps["signAllTransactions"] | undefined>
  signMessage: Accessor<MessageSignerWalletAdapterProps["signMessage"] | undefined>
  signTransaction: Accessor<SignerWalletAdapter["signTransaction"] | undefined>
}

const [WalletProvider, _useWallet] = createContextProvider((props: WalletProviderProps) => {
  const [autoConnect, setAutoConnect] = createSignal(props.autoConnect ?? false)
  const [wallets, setWallets] = createStore<Wallet[]>(props.wallets ?? [])
  const [walletsByName, setWalletsByName] = createStore<Record<WalletName, Adapter>>({})
  const [connected, setConnected] = createSignal<boolean>(false)
  const [connecting, setConnecting] = createSignal<boolean>(false)
  const [disconnecting, setDisconnecting] = createSignal<boolean>(false)
  const [localStorageKey, setLocalStorageKey] = createSignal<string>("walletAdapter")
  const [adapter, setAdapter] = createSignal<Adapter | undefined>()
  const [publicKey, setPublicKey] = createSignal<PublicKey | undefined>()
  const [ready, setReady] = createSignal<WalletReadyState>(WalletReadyState.Unsupported)

  const name = createMemo<WalletName | undefined>(() => {
    const _adapter = adapter()
    return _adapter ? _adapter.name : undefined
  })

  const signTransaction = createMemo<SignerWalletAdapter["signTransaction"] | undefined>(() => {
    const _adapter = adapter()
    if (!_adapter) {
      return
    }
    if (!("signTransaction" in _adapter)) {
      return
    }
    return async tx => {
      if (!_adapter.connected) {
        throw new WalletNotConnectedError()
      }
      return await _adapter.signTransaction(tx)
    }
  })

  const signAllTransactions = createMemo<SignerWalletAdapter["signAllTransactions"] | undefined>(
    () => {
      const _adapter = adapter()
      if (!_adapter) {
        return
      }
      if (!("signTransaction" in _adapter)) {
        return
      }
      return async tx => {
        if (!_adapter.connected) {
          throw new WalletNotConnectedError()
        }
        return await _adapter.signAllTransactions(tx)
      }
    },
  )

  const signMessage = createMemo<MessageSignerWalletAdapter["signMessage"] | undefined>(() => {
    const _adapter = adapter()
    if (!_adapter) {
      return
    }
    if (!("signMessage" in _adapter)) {
      return
    }
    return async tx => {
      if (!_adapter.connected) {
        throw new WalletNotConnectedError()
      }
      return await _adapter.signMessage(tx)
    }
  })

  function onConnect() {
    const _adapter = adapter()
    if (!_adapter) {
      console.error("onConnect: missing adapter: ", _adapter)
      return
    }
    batch(() => {
      setPublicKey(_adapter.publicKey ?? undefined)
      setConnected(_adapter.connected)
    })
  }

  function onDisconnect() {
    resetWallet()
  }

  function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
    const _adapter = adapter()
    if (!_adapter) {
      return
    }
    batch(() => {
      setReady(_adapter.readyState)
      // When the wallets change, start to listen for changes to their `readyState`
      setWallets(
        ws => ws.adapter.name === this.name,
        prev => ({ ...prev, readyState }),
      )
    })
  }

  function addAdapterEventListeners(adapter: Adapter) {
    wallets.forEach(({ adapter }) => {
      adapter.on("readyStateChange", onReadyStateChange, adapter)
    })
    adapter.on("connect", onConnect)
    adapter.on("disconnect", onDisconnect)
  }

  function removeAdapterEventListeners(): void {
    const _adapter = adapter()
    if (!_adapter) {
      console.error(
        "removeAdapterEventListeners: failed to remove adapter event listeners, missing adapter: ",
        _adapter,
      )
      return
    }
    wallets.forEach(({ adapter }) => {
      adapter.off("readyStateChange", onReadyStateChange, adapter)
    })
    _adapter.off("connect", onConnect)
    _adapter.off("disconnect", onDisconnect)
  }

  function updateAdapter(adapter: Adapter | undefined) {
    removeAdapterEventListeners()
    if (adapter) {
      addAdapterEventListeners(adapter)
    }
    setAdapter(adapter)
  }

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
    return adapterAutoConnect && !!_adapter && !connected() && !connecting() && connectableState
  }

  function updateWalletState(adapter: Adapter | undefined) {
    updateAdapter(adapter)

    batch(() => {
      setReady(adapter?.readyState ?? WalletReadyState.Unsupported)
      setPublicKey(adapter?.publicKey ?? undefined)
      setConnected(adapter?.connected ?? false)
    })

    if (shouldAutoConnect()) {
      autoConnectAdapter()
    }
  }

  function resetWallet() {
    updateWalletName(undefined)
  }

  function updateWalletName(name: WalletName | undefined) {
    const _adapter = walletsByName[name as WalletName] ?? undefined

    setLocalStorage(localStorageKey(), name)
    updateWalletState(_adapter)
  }

  async function select(walletName: WalletName): Promise<void> {
    const _name = name()
    if (_name === walletName && _name != null) {
      return
    }
    const _adapter = adapter()
    if (_adapter) {
      await disconnect()
    }
    updateWalletName(walletName)
  }

  async function sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ): Promise<TransactionSignature> {
    const _connected = connected()
    if (!_connected) {
      throw new WalletNotConnectedError()
    }
    const _adapter = adapter()
    if (!_adapter) {
      console.error("sendTransaction failed: WALLET NOT CONNECTED")
      throw new Error("WALLET NOT CONNECTED")
    }
    const res = await _adapter.sendTransaction(transaction, connection, options)
    return res
  }

  async function autoConnectAdapter() {
    const _adapter = adapter()
    try {
      setConnecting(true)
      await _adapter?.connect()
    } catch (error: unknown) {
      // Clear the selected wallet
      resetWallet()
      // Don't throw error, but onError will still be called
    } finally {
      setConnecting(false)
    }
  }

  async function connect(): Promise<void> {
    if (connected() || connecting() || disconnecting()) return
    const _adapter = adapter()
    const _ready = ready()
    if (!_adapter) {
      console.error("failed to connect, missing adapter!")
      return
    }

    if (!(_ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable)) {
      resetWallet()

      if (typeof window !== "undefined") {
        window.open(_adapter.url, "_blank")
      }

      throw new WalletNotReadyError()
    }

    try {
      setConnecting(true)
      await _adapter.connect()
    } catch (error: unknown) {
      resetWallet()
      throw error
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
      resetWallet()
      setDisconnecting(false)
    }
  }

  function updateConfig(
    walletConfig: WalletReturnConfig & { walletsByName: Record<WalletName, Adapter> },
  ) {
    batch(() => {
      setLocalStorageKey(walletConfig.localStorageKey)
      setAutoConnect(() => walletConfig.autoConnect)
      setWallets(walletConfig.wallets)
      setWalletsByName(walletConfig.walletsByName)
    })
  }

  async function initialize({
    wallets,
    autoConnect = false,
    localStorageKey = "walletAdapter",
  }: WalletPropsConfig): Promise<void> {
    const walletsByName = wallets.reduce<Record<WalletName, Adapter>>((walletsByName, wallet) => {
      walletsByName[wallet.name] = wallet
      return walletsByName
    }, {})

    // Wrap adapters to conform to the `Wallet` interface
    const mapWallets = wallets.map(adapter => ({
      adapter,
      readyState: adapter.readyState,
    }))

    updateConfig({
      wallets: mapWallets,
      walletsByName,
      autoConnect,
      localStorageKey,
    })

    const walletName = getLocalStorage<WalletName>(localStorageKey)
    if (walletName) {
      await select(walletName)
    }
  }

  onMount(() => {
    // Ensure the adapter listeners are invalidated before refreshing the page.
    window.addEventListener("beforeunload", removeAdapterEventListeners)
    onCleanup(() => {
      window.removeEventListener("beforeunload", removeAdapterEventListeners)
    })
  })

  onMount(() => {
    wallets.forEach(({ adapter }) => {
      addAdapterEventListeners(adapter)
      adapter.on("readyStateChange", onReadyStateChange, adapter)
    })
  })

  return {
    name,
    publicKey,
    connected,
    connecting,
    disconnecting,
    localStorageKey,
    ready,
    adapter,
    wallets,
    walletsByName,

    signTransaction,
    signMessage,
    signAllTransactions,

    autoConnect,
    connect,
    disconnect,
    select,
    sendTransaction,
    initialize,
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
