import { SupportedTransactionVersions, WalletName } from "@solana/wallet-adapter-base"
import {
  batch,
  Component,
  createEffect,
  createMemo,
  createSignal,
  JSXElement,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { createContextProvider } from "@solid-primitives/context"
import {
  AccountInfo,
  AvailableWalletsChangedEvent,
  ConnectingEvent,
  WalletChangedEvent,
  WalletEvent,
  WalletInfo,
  dispatchGetAvailableWallets,
} from "@solana-wallets/core-2.0"

import { DEFAULT_LOCALE, Locale } from "../translation/i18"
import { TranslationProvider, useTranslation } from "../translation/useTranslation"
import UnifiedWalletModal from "../../components/UnifiedWalletModal"
import { KEY } from "./localstorage"

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
  // metadata: UnifiedWalletMetadata
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
  locale?: Locale
}

export type UnifiedWalletMetadata = {
  name: string
  url: string
  description: string
  iconUrls: string[] // full uri, first icon will be used as main icon (png, jpg, svg)
  additionalInfo?: string
}

/**
 * Modal event to allow custom element
 * modal button to trigger custom element modal
 */
export const ModalEvent = {
  UPDATE_MODAL: "unified:update-modal",
} as const

export type UpdateModalEvent = CustomEvent<{ open: boolean }>
export function dispatchUpdateModal(open: boolean) {
  const toggleModalEvent = new CustomEvent(ModalEvent.UPDATE_MODAL, {
    detail: { open }, // Optional additional data
  })
  window.dispatchEvent(toggleModalEvent)
}

const [_UnifiedWalletProvider, _useUnifiedWallet] = createContextProvider(
  (props: UnifiedWalletConfig) => {
    // Locale info
    const { t, locale, setLocale } = useTranslation()

    // Wallet info
    const [wallets, setWallets] = createSignal<WalletInfo[]>()
    const [account, setAccount] = createSignal<AccountInfo>()
    const [connecting, setConnecting] = createSignal<boolean>(false)
    const name = createMemo(() => account()?.info?.name)
    const publicKey = createMemo(() => {
      const acc = account()
      if (!acc) {
        return
      }
      return acc.type === "custom"
        ? (acc.info.publicKey?.toString() ?? undefined)
        : acc.info?.pubKey
    })

    // Modal state
    const [isModalOpen, setIsModalOpen] = createSignal<boolean>(false)

    function getPreviouslyConnected() {
      try {
        const value = localStorage.getItem(KEY.PREVIOUSLY_CONNECTED)
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
      localStorage.setItem(KEY.PREVIOUSLY_CONNECTED, JSON.stringify(connected))
    }

    function onWalletChangedHandler(event: Event) {
      const walletChangedEvent = event as WalletChangedEvent
      console.log("wallet changed event: ", { new_wallet: walletChangedEvent.detail.wallet })
      batch(() => {
        setIsModalOpen(false)
        setAccount(walletChangedEvent.detail.wallet)
      })
    }

    function onWalletConnectingHandler(event: Event) {
      const walletConnectingEvent = event as ConnectingEvent
      setConnecting(walletConnectingEvent.detail.connecting)
    }

    function onUpdateModalHandler(event: Event) {
      const updateModalEvent = event as UpdateModalEvent
      console.log({ updateModalEvent })
      setIsModalOpen(updateModalEvent.detail.open)
    }

    function onAvailableWalletsChangedHandler(event: Event) {
      const availableWalletsChangedEvent = event as AvailableWalletsChangedEvent
      setWallets(availableWalletsChangedEvent.detail.wallets)
    }

    onMount(() => {
      console.log("UnifiedWalletProvider: onMount!")
      window.addEventListener(WalletEvent.WALLET_CHANGED, onWalletChangedHandler)
      window.addEventListener(WalletEvent.CONNECTING, onWalletConnectingHandler)
      window.addEventListener(ModalEvent.UPDATE_MODAL, onUpdateModalHandler)
      window.addEventListener(
        WalletEvent.AVAILABLE_WALLETS_CHANGED,
        onAvailableWalletsChangedHandler,
      )
      onCleanup(() => {
        window.removeEventListener(WalletEvent.WALLET_CHANGED, onWalletChangedHandler)
        window.removeEventListener(WalletEvent.CONNECTING, onWalletConnectingHandler)
        window.removeEventListener(ModalEvent.UPDATE_MODAL, onUpdateModalHandler)
        window.removeEventListener(
          WalletEvent.AVAILABLE_WALLETS_CHANGED,
          onAvailableWalletsChangedHandler,
        )
      })
    })

    // Query for existing registered wallets
    onMount(() => {
      dispatchGetAvailableWallets()
    })

    createEffect(() => {
      console.log("unified modal wallet store changed: ", { wallets: wallets() })
    })

    createEffect(
      on([account, publicKey], ([account, pubKey]) => {
        if (!pubKey || !account) {
          return
        }
        const prevConnected = getPreviouslyConnected()
        const combined = [...prevConnected]
        // make sure the most recently connected wallet is first
        if (account.info?.name) {
          combined.unshift(account.info.name)
        }
        const uniques = new Set(combined)
        setPreviouslyConnected([...uniques])
      }),
    )

    return {
      t,
      locale,
      setLocale,
      theme: props.theme,
      // metadata: props.metadata,

      getPreviouslyConnected,
      setPreviouslyConnected,

      name,
      publicKey,
      account,
      connecting,
      wallets,

      isModalOpen,
      setIsModalOpen,

      walletAttachments: props.walletAttachments,
      walletlistExplanation: props.walletlistExplanation,
      walletPrecedence: props.walletPrecedence,
      walletModalAttachments: props.walletModalAttachments,
    }
  },
)

// const UnifiedWalletModal = lazy(() => import("../../components/UnifiedWalletModal"))

export type UnifiedWalletModalProps = {
  isExpanded?: boolean
}

const UnifiedWalletModalProvider: Component<UnifiedWalletProviderProps> = props => {
  return (
    <>
      <TranslationProvider locale={props.locale ?? DEFAULT_LOCALE}>
        <_UnifiedWalletProvider>
          <UnifiedWalletModal />
        </_UnifiedWalletProvider>
      </TranslationProvider>
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

export { UnifiedWalletModalProvider, useUnifiedWallet }
