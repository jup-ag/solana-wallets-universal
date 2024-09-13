import {
  SupportedTransactionVersions,
  WalletAdapterCompatibleStandardWallet,
  WalletName,
} from "@solana/wallet-adapter-base"
import { createEffect, createSignal, JSXElement, on, ParentComponent, splitProps } from "solid-js"
import { createContextProvider } from "@solid-primitives/context"
import {
  Cluster,
  select,
  useWallet,
  WalletProvider,
  WalletProviderProps,
} from "@solana-wallets-solid/core"

import { DEFAULT_LOCALE, Locale } from "../translation/i18"
import { TranslationProvider, useTranslation } from "../translation/useTranslation"
// import { THardcodedWalletStandardAdapter } from "./HardcodedWalletStandardAdapter"
// import { UnifiedWalletModal } from "../../components/UnifiedWalletModal"

import { UnifiedWalletModalProps } from "../../components"
import UnifiedWalletModal from "../../components/UnifiedWalletModal"

export const MWA_NOT_FOUND_ERROR = "MWA_NOT_FOUND_ERROR"
export type UnifiedTheme = "light" | "dark" | "jupiter"

export type WalletNotification = {
  publicKey: string
  shortAddress: string
  walletName: string
  metadata: {
    name: string
    url: string
    icon: string
    supportedTransactionVersions?: SupportedTransactionVersions
  }
}

export type UnifiedWalletConfig = {
  metadata: UnifiedWalletMetadata
  env: Cluster
  walletPrecedence?: WalletName[]
  // hardcodedWallets?: THardcodedWalletStandardAdapter[]
  notificationCallback?: {
    onConnect: (props: WalletNotification) => void
    onConnecting: (props: WalletNotification) => void
    onDisconnect: (props: WalletNotification) => void
    onNotInstalled: (props: WalletNotification) => void
    // TODO: Support wallet account change
    // onChangeAccount: (props: IWalletNotification) => void,
  }
  walletlistExplanation?: {
    href: string
  }
  // Default to light
  theme?: UnifiedTheme
  walletAttachments?: Record<string, { attachment: JSXElement }>
  walletModalAttachments?: {
    footer?: JSXElement
  }
}

export type UnifiedWalletProviderProps = {
  autoConnect: boolean
  disconnectOnAccountChange: boolean
  wallets: WalletProviderProps["wallets"]
  config: UnifiedWalletConfig
  locale?: Locale
}

export type UnifiedWalletMetadata = {
  name: string
  url: string
  description: string
  iconUrls: string[] // full uri, first icon will be used as main icon (png, jpg, svg)
  additionalInfo?: string
}

const [_UnifiedWalletProvider, _useUnifiedWallet] = createContextProvider(
  (props: UnifiedWalletConfig) => {
    const { t, locale, setLocale } = useTranslation()
    const {
      wallets,
      // select,
      name,
      wallet,
      publicKey,
      // signTransaction,
      // sendTransaction,
      // signMessage,
      // signAllTransactions,
      // connect,
      connected,
      connecting,
      // disconnect,
    } = useWallet()
    const [showModal, setShowModal] = createSignal<boolean>(false)

    function getPreviouslyConnected() {
      try {
        const value = localStorage.getItem("unified-wallet-previously-connected")
        if (!value) {
          return []
        }
        return JSON.parse(value) as string[]
      } catch (error: any) {
        if (typeof window !== "undefined") {
          console.error(error)
        }
        return []
      }
    }

    function setPreviouslyConnected(connected: string[]) {
      localStorage.setItem("unified-wallet-previously-connected", JSON.stringify(connected))
    }

    createEffect(
      on([wallet, publicKey], ([wallet, pubKey]) => {
        if (!pubKey || !wallet) {
          return
        }
        const prevConnected = getPreviouslyConnected()

        // make sure the most recently connected wallet is first
        const combined = new Set([wallet.name, ...prevConnected])
        setPreviouslyConnected([...combined])
      }),
    )

    async function handleConnectClick(wallet: WalletAdapterCompatibleStandardWallet) {
      try {
        setShowModal(false)

        // Connecting
        // props.notificationCallback?.onConnecting({
        //   publicKey: "",
        //   shortAddress: "",
        //   walletName: adapter.name,
        //   metadata: {
        //     name: adapter.name,
        //     url: adapter.name,
        //     icon: adapter.icon,
        //     supportedTransactionVersions: adapter.supportedTransactionVersions,
        //   },
        // })

        // Might throw WalletReadyState.WalletNotReady
        await select(wallet)

        // Weird quirks for autoConnect to require select and connect
        // if (!props.autoConnect) {
        //   setNonAutoConnectAttempt(true);
        // }

        // if (adapter.readyState === WalletReadyState.NotDetected) {
        //   throw WalletReadyState.NotDetected
        // }
      } catch (error) {
        console.error(error)

        // Not Installed
        // props.notificationCallback?.onNotInstalled({
        //   publicKey: "",
        //   shortAddress: "",
        //   walletName: adapter.name,
        //   metadata: {
        //     name: adapter.name,
        //     url: adapter.url,
        //     icon: adapter.icon,
        //     supportedTransactionVersions: adapter.supportedTransactionVersions,
        //   },
        // })
      }
    }

    createEffect(
      on([wallet, publicKey], ([wallet, pubKey], prev) => {
        if (wallet && pubKey) {
          // props.notificationCallback?.onConnect({
          //   publicKey: publicKey.toString(),
          //   shortAddress: shortenAddress(publicKey.toString()),
          //   walletName: adapter.name,
          //   metadata: {
          //     name: adapter.name,
          //     url: adapter.url,
          //     icon: adapter.icon,
          //     supportedTransactionVersions: adapter.supportedTransactionVersions,
          //   },
          // })
          return
        }

        if (!prev) {
          return
        }

        const [prevAdapter] = prev
        if (prevAdapter && !wallet) {
          // props.notificationCallback?.onDisconnect({
          //   publicKey: prevPubKey?.toString() || "",
          //   shortAddress: shortenAddress(prevPubKey?.toString() || ""),
          //   walletName: prevAdapter.name || "",
          //   metadata: {
          //     name: prevAdapter.name,
          //     url: prevAdapter.url,
          //     icon: prevAdapter.icon,
          //     supportedTransactionVersions: prevAdapter.supportedTransactionVersions,
          //   },
          // })
        }
      }),
    )

    return {
      t,
      locale,
      setLocale,
      theme: props.theme,
      env: props.env,
      metadata: props.metadata,

      wallets,
      wallet,
      name,
      publicKey,
      select,
      // connect,
      connected,
      connecting,
      // disconnect,
      // signMessage,
      // signTransaction,
      // signAllTransactions,
      // sendTransaction,

      getPreviouslyConnected,

      showModal,
      setShowModal,
      handleConnectClick,
      walletAttachments: props.walletAttachments,
      walletlistExplanation: props.walletlistExplanation,
      walletPrecedence: props.walletPrecedence,
      walletModalAttachments: props.walletModalAttachments,
    }
  },
)

// const UnifiedWalletModal = lazy(() => import("../../components/UnifiedWalletModal"))

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "unified-wallet-modal": UnifiedWalletModalProps
    }
  }
}

export const UnifiedWalletModalProvider: ParentComponent = props => {
  const { showModal, setShowModal, wallets, getPreviouslyConnected, walletPrecedence } =
    useUnifiedWallet()
  function onClose() {
    console.log("onClose!")
    setShowModal(false)
  }
  return (
    <>
      <unified-wallet-modal
        wallets={wallets()}
        onClose={onClose}
        getPreviouslyConnected={getPreviouslyConnected}
        walletPrecedence={walletPrecedence}
        showModal={showModal}
        setShowModal={setShowModal}
      />
      <UnifiedWalletModal
        wallets={wallets()}
        onClose={onClose}
        getPreviouslyConnected={getPreviouslyConnected}
        walletPrecedence={walletPrecedence}
        showModal={showModal}
        setShowModal={setShowModal}
      />
      {props.children}
    </>
  )
}

const useUnifiedWallet = () => {
  const context = _useUnifiedWallet()
  if (!context) {
    throw new Error("useUnifiedWallet must be used within a UnifiedWalletProvider")
  }
  return context
}

const UnifiedWalletProvider: ParentComponent<UnifiedWalletProviderProps> = _props => {
  const [local, rest] = splitProps(_props, ["children"])
  return (
    <TranslationProvider locale={rest.locale ?? DEFAULT_LOCALE}>
      <WalletProvider
        wallets={rest.wallets}
        autoConnect={rest.autoConnect}
        disconnectOnAccountChange={rest.disconnectOnAccountChange}
        localStorageKey="walletAdapter"
      >
        <_UnifiedWalletProvider {...rest.config}>
          <UnifiedWalletModalProvider>{local.children}</UnifiedWalletModalProvider>
        </_UnifiedWalletProvider>
      </WalletProvider>
    </TranslationProvider>
  )
}

export type { Wallet } from "@solana-wallets-solid/core"
export { UnifiedWalletProvider, useUnifiedWallet }
