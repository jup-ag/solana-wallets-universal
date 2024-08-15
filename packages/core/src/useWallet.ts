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
  isWalletAdapterCompatibleStandardWallet,
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
import { batch, createSignal, Accessor, onMount, createMemo, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { createContextProvider } from "@solid-primitives/context"
import { DEPRECATED_getWallets } from "@wallet-standard/app"
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base"

import { getLocalStorage, setLocalStorage } from "./localstorage"

export type Wallet = {
  adapter: Adapter
  readyState: WalletReadyState
}

export type ErrorHandler = (error: WalletError) => void
export type WalletPropsConfig = Pick<WalletContext, "autoConnect"> & {
  localStorageKey: string
  wallets: Adapter[]
}
export type WalletProviderProps = Pick<WalletContext, "wallets" | "autoConnect"> & {
  localStorageKey: string
}

export type WalletStatus = Pick<WalletContext, "connected" | "publicKey">

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

function detectedFirst(state: WalletReadyState, a: Adapter, b: Adapter) {
  let sort: number = 0
  const isDetected = (c: Adapter) => c.readyState === state

  if (isDetected(a) && !isDetected(b)) sort = -1
  if (!isDetected(a) && isDetected(b)) sort = 1
  return sort
}

const [WalletProvider, _useWallet] = createContextProvider((props: WalletProviderProps) => {
  // All wallet info
  const [wallets, setWallets] = createStore<Wallet[]>(props.wallets ?? [])
  const walletsByName = createMemo(() => {
    return wallets.reduce<Record<WalletName, Adapter>>((_walletsByName, _wallet) => {
      _walletsByName[_wallet.adapter.name] = _wallet.adapter
      return _walletsByName
    }, {})
  })

  // Selected wallet info
  const [adapter, setAdapter] = createSignal<Adapter | undefined>()
  const [publicKey, setPublicKey] = createSignal<PublicKey | undefined>()
  const name = createMemo<WalletName | undefined>(() => {
    const _adapter = adapter()
    return _adapter ? _adapter.name : undefined
  })

  // Selected wallet connection state
  const [autoConnect] = createSignal(props.autoConnect ?? false)
  const [connected, setConnected] = createSignal<boolean>(false)
  const [connecting, setConnecting] = createSignal<boolean>(false)
  const [disconnecting, setDisconnecting] = createSignal<boolean>(false)
  const [ready, setReady] = createSignal<WalletReadyState>(WalletReadyState.Unsupported)

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
    console.log("onConnect new values: ", {
      pubKey: _adapter.publicKey,
      connected: _adapter.connected,
    })
    batch(() => {
      setPublicKey(_adapter.publicKey ?? undefined)
      setConnected(_adapter.connected)
    })
  }

  function onDisconnect() {
    resetWallet()
  }

  function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
    batch(() => {
      // setReady(_adapter.readyState)
      // When the wallets change, start to listen for changes to their `readyState`
      setWallets(
        ws => ws.adapter.name === this.name,
        prev => ({ ...prev, readyState }),
      )
    })
  }

  function addAdapterEventListeners(adapter: Adapter) {
    adapter.on("connect", onConnect)
    adapter.on("disconnect", onDisconnect)
  }

  function removeAdapterEventListeners(): void {
    const _adapter = adapter()
    if (!_adapter) {
      console.error(
        "removeAdapterEventListeners: no adapter events to remove since adapter is not connected",
        _adapter,
      )
      return
    }
    _adapter.off("connect", onConnect)
    _adapter.off("disconnect", onDisconnect)
  }

  /**
   * Update connect/disconnect event listeners
   * to track newly connected wallet
   */
  function updateAdapter(adapter: Adapter | undefined) {
    console.log(
      "updateAdapter! (remove adapter event listeners, add if adapter exists and sets adapter)",
    )
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

    const newReady = adapter?.readyState ?? WalletReadyState.Unsupported
    const newPubKey = adapter?.publicKey ?? undefined
    const newConnected = adapter?.connected ?? false

    console.log("updateWalletState! ", { adapter, newReady, newPubKey, newConnected })

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
    const _adapter = name ? walletsByName()[name] : undefined
    setLocalStorage(props.localStorageKey, name)
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
      throw new Error("sendTransaction failed: WALLET NOT CONNECTED")
    }
    const res = await _adapter.sendTransaction(transaction, connection, options)
    return res
  }

  async function autoConnectAdapter() {
    const _adapter = adapter()
    console.log("autoConnectAdapter! will run adapter.connect if not undefined: ", {
      adapter: _adapter,
    })
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
      setDisconnecting(false)
    }
  }

  /** Get installed wallets compatible with the standard
   * and adds them to pre-added list of wallets
   */
  function updateWallets() {
    console.log("updateWallets!")
    const { get } = DEPRECATED_getWallets()
    const _wallets = get()
      .filter(w => w.accounts.length > 0)
      .map(w => ({
        ...w,
        accounts: w.accounts.map(w => ({ ...w, publicKey: new Uint8Array(w.publicKey) })),
      }))
    const standardWallets = _wallets
      // select wallets compatible with the Wallet Standard
      .filter(w => isWalletAdapterCompatibleStandardWallet(w))
      // select wallets not already configured by the dapp
      // .filter(wallet => !wallets.some(({ adapter }) => adapter.name === name))
      // wrap as a Standard Adapter class
      .map(wallet => new StandardWalletAdapter({ wallet }))

    console.log({ _wallets, standardWallets, wallets: wallets.map(w => w.adapter) })
    const allWallets = [...standardWallets, ...wallets.map(w => w.adapter)]

    // // merge standard mobile wallet if available
    // const mobileWallet = getMobileWallet(allWallets)
    // if (mobileWallet) allWallets.unshift(mobileWallet)

    // sort 'Installed' wallets first and 'Loadable' next
    const installedFirst = (a: Adapter, b: Adapter) =>
      detectedFirst(WalletReadyState.Installed, a, b)
    const loadableFirst = (a: Adapter, b: Adapter) => detectedFirst(WalletReadyState.Loadable, a, b)
    allWallets.sort(loadableFirst).sort(installedFirst)

    console.log("updateWallets: ", { allWallets })
  }

  onMount(async () => {
    const walletName = getLocalStorage<WalletName>(props.localStorageKey)
    if (walletName) {
      await select(walletName)
    }
  })

  onMount(() => {
    // Ensure the adapter listeners are invalidated before refreshing the page.
    window.addEventListener("beforeunload", removeAdapterEventListeners)
    onCleanup(() => {
      window.removeEventListener("beforeunload", removeAdapterEventListeners)
    })
  })

  /** Add ready state change listeners for all wallets,
   * wallet state should update regardless of whether
   * any wallet is currently connected
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

  onMount(() => {
    console.log("onMount: updateWallets!")
    updateWallets()
    const { on } = DEPRECATED_getWallets()
    const removeRegisterListener = on("register", updateWallets)
    const removeUnregisterListener = on("unregister", updateWallets)
    onCleanup(() => {
      removeRegisterListener()
      removeUnregisterListener()
    })
  })

  return {
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

    autoConnect,
    connect,
    disconnect,
    select,
    sendTransaction,
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
