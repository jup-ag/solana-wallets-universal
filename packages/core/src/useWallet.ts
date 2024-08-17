import {
  Adapter,
  isWalletAdapterCompatibleStandardWallet,
  MessageSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
  SendTransactionOptions,
  SignerWalletAdapter,
  SignerWalletAdapterProps,
  WalletAdapter,
  WalletError,
  WalletName,
  // isWalletAdapterCompatibleStandardWallet,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  WalletSignMessageError,
} from "@solana/wallet-adapter-base"
import {
  type Wallet as StandardWallet,
  type WalletWithFeatures as StandardWalletWithFeatures,
} from "@wallet-standard/base"
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
  Cluster,
} from "@solana/web3.js"
import {
  batch,
  createSignal,
  Accessor,
  onMount,
  createMemo,
  onCleanup,
  createEffect,
  on,
} from "solid-js"
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
// import { M } from '@wallet-standard/base';
import type { StandardEventsFeature } from "@wallet-standard/features"
import { StandardEvents, StandardConnect } from "@wallet-standard/features"

import type { WalletAccount } from "@wallet-standard/core"
import { ReadonlyWalletAccount } from "@wallet-standard/core"

export abstract class PossiblyLedgerWalletAccount extends ReadonlyWalletAccount {
  abstract readonly ledger: boolean
}

export class SignerWalletAccount extends PossiblyLedgerWalletAccount {
  get ledger() {
    return false
  }

  constructor(account: WalletAccount) {
    super(account)
    if (new.target === SignerWalletAccount) {
      Object.freeze(this)
    }
  }
}

export function walletHasStandardEventsFeature(
  wallet: StandardWallet,
): wallet is StandardWalletWithFeatures<StandardEventsFeature> {
  console.log({ wallet })
  if (wallet.features) {
    return StandardEvents in wallet.features
  } else {
    return false
  }
}

import { getLocalStorage, setLocalStorage } from "./localstorage"
import { SolanaSignMessage } from "@solana/wallet-standard-features"

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
  env?: Cluster
  localStorageKey: string
}

export type WalletStatus = Pick<WalletContext, "connected" | "publicKey">

export type WalletContext = {
  // props
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  wallets: Wallet[]

  // wallet state
  env: Cluster
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
    console.log("updating walletsByName")
    return wallets.reduce<Record<WalletName, Adapter>>((_walletsByName, newWallet) => {
      const existing = _walletsByName[newWallet.adapter.name]
      // Update no existing wallet adapter
      if (!existing) {
        console.log("Update no existing wallet adapter: ", newWallet.adapter)
        _walletsByName[newWallet.adapter.name] = newWallet.adapter
        return _walletsByName
      }
      // Don't update existing non-standard wallet adapters
      if (!(existing instanceof StandardWalletAdapter)) {
        return _walletsByName
      }
      // Update standard wallet adapter if more accounts added
      if (
        newWallet instanceof StandardWalletAdapter &&
        newWallet.wallet.accounts.length > existing.wallet.accounts.length
      ) {
        console.log("Update standard wallet adapter if more accounts added: ", newWallet.adapter)
        _walletsByName[newWallet.adapter.name] = newWallet.adapter
        return _walletsByName
      }
      return _walletsByName
    }, {})
  })

  // Selected wallet info
  //  const [adapter, setAdapter] = createSignal<Adapter | undefined>()
  // const [name, setName] = createSignal<WalletName | undefined>()
  //  const [publicKey, setPublicKey] = createSignal<PublicKey | undefined>()
  //  const name = createMemo<WalletName | undefined>(() => {
  //    const _adapter = adapter()
  //    return _adapter ? _adapter.name : undefined
  //  })

  const [name, setName] = createSignal<WalletName | undefined>()
  const [publicKey, setPublicKey] = createSignal<PublicKey | undefined>()
  const [account, setAccount] = createSignal<WalletAccount | undefined>()
  const adapter = (): Adapter | undefined => {
    const _name = name()
    if (!_name) {
      return
    }
    const _adapter = walletsByName()[_name]
    return _adapter
  }
  createEffect(() => {
    console.log("adapter updated: ", { adapter: adapter() })
  })

  // Selected wallet connection state
  const [env] = createSignal<Cluster>(props.env ?? "mainnet-beta")
  const [connected, setConnected] = createSignal<boolean>(false)
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
    return adapterAutoConnect && !!_adapter && !connected() && !connecting() && connectableState
  }

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

  const signMessage = (): MessageSignerWalletAdapter["signMessage"] | undefined => {
    const _connected = connected()
    const _account = account()
    const _adapter = adapter()
    console.log({ _connected, _adapter, _account })
    if (!_adapter || !_connected || !_account) {
      console.log("cannot sign message, missing connected adapter with pubKey: ", {
        _connected,
        _adapter,
      })
      return
    }
    if (_adapter instanceof StandardWalletAdapter) {
      console.log("sign message found in _adapter.wallet.features")
      return async tx => {
        const _connected = connected()
        const _account = account()
        if (!_connected || !_account) {
          throw new WalletNotConnectedError()
        }
        const _adapter = adapter()
        if (!_adapter) {
          throw new WalletNotConnectedError()
        }
        if (!(_adapter instanceof StandardWalletAdapter)) {
          throw new WalletSignMessageError("adapter is not a standard wallet adapter!")
        }
        if (!(SolanaSignMessage in _adapter.wallet.features)) {
          throw new WalletSignMessageError(
            "SolanaSignMessage NOT found in _adapter.wallet.features: ",
          )
        }
        const feature = _adapter.wallet.features[SolanaSignMessage]
        console.log({
          _account,
          _adapter,
        })
        const res = await feature.signMessage({
          account: _account as any,
          message: tx,
        })
        console.log({ res })
        const firstRes = res[0]
        if (!firstRes) {
          throw new WalletError("failed to sign message")
        }
        return firstRes.signature
      }
    }
    if (!("signMessage" in _adapter)) {
      console.log("signMessage not found in _adapter!")
      return
    }
    return async tx => {
      if (!_adapter.connected) {
        throw new WalletNotConnectedError()
      }
      return await _adapter.signMessage(tx)
    }
  }

  function onConnect(newKey: PublicKey) {
    const _adapter = adapter()
    if (!_adapter) {
      console.error("onConnect: missing adapter: ", _adapter)
      return
    }
    console.log("onConnect new values: ", {
      pubKey: newKey,
      connected: _adapter.connected,
    })
    batch(() => {
      setPublicKey(newKey)
      setConnected(true)
    })
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
    console.log("resetWallet!")
    updateWallet(undefined)
  }

  function updateWallet(name: WalletName | undefined) {
    setLocalStorage(props.localStorageKey, name)
    setName(name)
  }

  createEffect(
    on(adapter, async adapter => {
      console.log("adapter updated to: ", { adapter })
      if (!adapter) {
        setReady(WalletReadyState.NotDetected)
        return
      }

      /**
       * Update connect/disconnect event listeners
       * to track newly connected wallet
       */
      removeAdapterEventListeners(adapter)
      adapter.on("connect", onConnect)
      adapter.on("disconnect", onDisconnect)

      setReady(WalletReadyState.Loadable)

      const autoConnect = shouldAutoConnect()
      console.log({ autoConnect })

      if (autoConnect) {
        console.log("autoConnectAdapter! will run adapter.connect if not undefined: ", {
          adapter,
        })
        await connect()
      }
      //   try {
      //     setConnecting(true)
      //     await adapter.connect()
      //   } catch (error: unknown) {
      //     // Clear the selected wallet
      // console.log("")
      //     resetWallet()
      //     // Don't throw error, but onError will still be called
      //   } finally {
      //     setConnecting(false)
      //   }
      // }

      // const newReady = adapter.readyState
      // const newPubKey = adapter.publicKey ?? undefined
      // const newConnected = adapter.connected
      // console.log("updateWalletState! ", { adapter, newReady, newPubKey, newConnected })
      // batch(() => {
      //   setReady(newReady)
      //   setPublicKey(newPubKey)
      //   setConnected(newConnected)
      // })
    }),
  )

  async function select(walletName: WalletName): Promise<void> {
    console.log("1.selecting wallet: ", { walletName })
    const _name = name()
    if (_name === walletName && _name != null) {
      console.error(" already connected: ", { _name })
      return
    }

    const _adapter = adapter()
    console.log("2.disconnecting existing unmatching adapter: ", { _adapter })
    if (_adapter) {
      console.error("another wallet connected, disconnecting: ", { _adapter })
      await disconnect()
    }

    console.log("3.updating wallet to ", { walletName })
    updateWallet(walletName)

    // console.log("4.connect fn call")
    // await connect()
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

  // /**
  //  * Returns the feature object from the Wallet Standard `Wallet` that underlies a `UiWalletHandle`.
  //  * If the wallet does not support the feature, a `WalletStandardError` will be thrown.
  //  */
  //  function getWalletFeature(
  //     uiWalletHandle: TWalletHandle,
  //     featureName: TWalletHandle['features'][number]
  // ): unknown {
  //     const wallet = getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(uiWalletHandle);
  //     if (!(featureName in wallet.features)) {
  //         const err = new WalletStandardError(WALLET_STANDARD_ERROR__FEATURES__WALLET_FEATURE_UNIMPLEMENTED, {
  //             featureName,
  //             supportedChains: [...wallet.chains],
  //             supportedFeatures: Object.keys(wallet.features),
  //             walletName: wallet.name,
  //         });
  //         safeCaptureStackTrace(err, getWalletFeature);
  //         throw err;
  //     }
  //     return wallet.features[featureName];
  // }

  async function connect(): Promise<void> {
    if (connected() || connecting() || disconnecting()) {
      console.error("failed to connect since: ", {
        connected: connected(),
        connecting: connecting(),
        disconnecting: disconnecting(),
      })
      return
    }
    const _adapter = adapter()
    const _ready = ready()
    console.error("connect! ", { _adapter, _ready })
    if (!_adapter) {
      console.error("failed to connect, missing adapter!")
      return
    }

    if (!(_ready === WalletReadyState.Installed || _ready === WalletReadyState.Loadable)) {
      console.error("resetting wallet!")
      resetWallet()

      if (typeof window !== "undefined") {
        window.open(_adapter.url, "_blank")
      }

      throw new WalletNotReadyError()
    }

    try {
      setConnecting(true)
      console.log("connecting: ", { _adapter })
      if (_adapter instanceof StandardWalletAdapter) {
        const res = await _adapter.wallet.features[StandardConnect].connect()
        console.log({ res })
        if (res.accounts.length > 0) {
          const acc = res.accounts[0]
          if (!acc) {
            console.log("res.accounts[0] is undefined: ", { acc })
            return
          }
          batch(() => {
            setReady(WalletReadyState.Loadable)
            setPublicKey(new PublicKey(acc.publicKey))
            setAccount(acc)
            setConnected(true)
          })
        }
      } else {
        await _adapter.connect()
        console.error("connected adapter is NOT standard wallet adapter")
        batch(() => {
          setReady(_adapter.readyState)
          setPublicKey(_adapter.publicKey ?? undefined)
          setConnected(true)
        })
      }
    } catch (error: unknown) {
      console.log("error running adapter.connect: ", { error })
      resetWallet()
    } finally {
      setConnecting(false)
      // setTempWallets([...get()])
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
      setConnected(false)
    }
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

    const isOnAndroid = (ua: string) => /android/i.test(ua)

    const isInWebView = (ua: string) =>
      /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i.test(
        ua,
      )

    const getUriForAppIdentity = () => {
      const { location } = globalThis
      if (location) return `${location.protocol}//${location.host}`
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
  function updateWallets(ws: StandardWallet[]) {
    console.log("updateWallets!")
    // const deprecated = _deprecatedWallets
    //   // .filter(w => isWalletAdapterCompatibleStandardWallet(w))
    //   .map(wallet => new StandardWalletAdapter({ wallet }))

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
          publicKey: a.publicKey as any,
          chains: a.chains,
        })),
      }))
      .filter(w => isWalletAdapterCompatibleStandardWallet(w))
      // select wallets compatible with the Wallet Standard
      // select wallets not already configured by the dapp
      // .filter(wallet => !wallets.some(({ adapter }) => adapter.name === name))
      // wrap as a Standard Adapter class
      .filter(w => {
        const existing = wallets.find(ex => ex.adapter.name === w.name && ex.adapter)
        if (!existing) {
          return true
        }
        const adapter = existing.adapter
        if (!(adapter instanceof StandardWalletAdapter)) {
          return false
        }
        if (w.accounts.length > adapter.wallet.accounts.length) {
          console.log("new wallet addapter has more accounts than old wallet adapter, replacing")
          return true
        }
        return false
      })
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
        standard.wallet.features[StandardEvents].on("change", x => {
          console.log("standard event change captured: ", { x: JSON.stringify(x), get: get() })
          setTempWallets([...get()])
        })
        return standard
      })

    console.log({
      // rawStandardWallets: ,
      standards,
      // filteredDeprecated: deprecated.map(w => w.name),
      wallets: wallets.map(w => w.adapter),
    })

    const filteredExisting = wallets.filter(w => !standards.find(s => s.name === w.adapter.name))
    const allWallets = [...standards, ...filteredExisting.map(w => w.adapter)]

    // merge standard mobile wallet if available
    const mobileWallet = getMobileWallet(allWallets)
    if (mobileWallet) {
      allWallets.unshift(mobileWallet)
    }

    // sort 'Installed' wallets first and 'Loadable' next
    const installedFirst = (a: Adapter, b: Adapter) =>
      detectedFirst(WalletReadyState.Installed, a, b)
    const loadableFirst = (a: Adapter, b: Adapter) => detectedFirst(WalletReadyState.Loadable, a, b)
    allWallets.sort(loadableFirst).sort(installedFirst)

    const newWallets: Wallet[] = allWallets.map(w => ({ adapter: w, readyState: w.readyState }))

    console.log("newWallets: ", { newWallets })

    setWallets(newWallets)
  }

  onMount(() => {
    // Ensure the adapter listeners are invalidated before refreshing the page.
    window.addEventListener("beforeunload", () => removeAdapterEventListeners())
    onCleanup(() => {
      window.removeEventListener("beforeunload", () => removeAdapterEventListeners())
    })
  })

  /** Add ready state change listeners for all wallets,
   * wallet state should update regardless of whether
   * any wallet is currently connected
   */
  function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
    // setReady(_adapter.readyState)
    // When the wallets change, start to listen for changes to their `readyState`
    setWallets(ws => ws.adapter.name === this.name, { adapter: this, readyState })
  }

  const { get } = getWallets()
  const [tempWallets, setTempWallets] = createSignal<StandardWallet[]>([])

  // const { on, get } = getWallets()
  // createEffect(() => {
  //   const _wallets = get()
  //   setTempWallets(_wallets)
  //   // _wallets.forEach(w => {
  //   //   ;(w.features[StandardEvents] as any).on("change", () => {
  //   //     console.log("change triggered: ", get())
  //   //   })
  //   // })
  //
  //   console.log({ _wallets })
  //   const handler = (...x: any[]) => {
  //     console.log({ x })
  //   }
  //   const remove = on("register", handler)
  //   onCleanup(() => {
  //     remove()
  //   })
  // })

  onMount(() => {
    const { on } = getWallets()
    console.log("onMount: updateWallets!")

    setTempWallets([...get()])
    const addWallet = (w: any) => {
      console.log("register addWallet called!")
      console.log({ w })
      setTempWallets([...get()])
    }
    const removeRegisterListener = on("register", addWallet)
    const removeUnregisterListener = on("unregister", addWallet)
    onCleanup(() => {
      removeRegisterListener()
      removeUnregisterListener()
    })
  })

  createEffect(
    on(tempWallets, ws => {
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
              publicKey: new Uint8Array(a.publicKey),
            })),
          }),
        )

      console.log("temp wallets changed: ", { filtered, tempWallets: ws })
      updateWallets(filtered)
    }),
  )

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

  onMount(async () => {
    const walletName = getLocalStorage<WalletName>(props.localStorageKey)
    if (walletName) {
      await select(walletName)
    }
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
