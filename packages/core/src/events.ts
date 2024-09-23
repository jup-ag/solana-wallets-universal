import { Wallet, WalletAccount } from "@wallet-standard/base"
import { WalletInfo } from "./store"

export type StandardEventChangeProperties = {
  readonly chains?: Wallet["chains"]
  readonly features?: Wallet["features"]
  readonly accounts?: Wallet["accounts"]
}
export const StandardEvent = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
} as const
export type StandardEvent = (typeof StandardEvent)[keyof typeof StandardEvent]
export function getEvent(event: StandardEventChangeProperties): StandardEvent | undefined {
  if (!event.features && !event.chains && event.accounts) {
    if (event.accounts.length > 0) {
      return StandardEvent.CONNECT
    } else {
      return StandardEvent.DISCONNECT
    }
  }
}

export type StandardWalletConnectResult =
  | {
      type: "standard"
      pubKey: string
      name: string
      icon: string
      account: WalletAccount
    }
  | undefined

export const WalletEvent = {
  CONNECT: "unified:connect",
  DISCONNECT: "unified:disconnect",
  CONNECTING: "unified:connecting",
  WALLET_CHANGED: "unified:wallet-changed",
  AVAILABLE_WALLETS_CHANGED: "unified:available-wallets-changed",
} as const

export type ConnectEvent = CustomEvent<{ wallet: string }>
export function dispatchConnect(name: string) {
  const connectEvent = new CustomEvent(WalletEvent.CONNECT, {
    detail: { wallet: name }, // Optional additional data
  })
  window.dispatchEvent(connectEvent)
}

export type ConnectingEvent = CustomEvent<{ connecting: boolean }>
export function dispatchConnecting(connecting: boolean) {
  const connectingEvent = new CustomEvent(WalletEvent.CONNECTING, {
    detail: { connecting },
  })
  window.dispatchEvent(connectingEvent)
}

export type DisconnectEvent = CustomEvent<{ wallet: string }>
export function dispatchDisconnect() {
  const disconnectEvent = new CustomEvent(WalletEvent.DISCONNECT)
  window.dispatchEvent(disconnectEvent)
}

export type WalletChangedEvent = CustomEvent<{
  wallet?: StandardWalletConnectResult | undefined
}>
export function dispatchWalletChanged(wallet?: StandardWalletConnectResult | undefined) {
  const getWalletChangedEvent = new CustomEvent(WalletEvent.WALLET_CHANGED, {
    detail: { wallet },
  })
  window.dispatchEvent(getWalletChangedEvent)
}

export type AvailableWalletsChangedEvent = CustomEvent<{
  wallets: WalletInfo[]
}>
export function dispatchAvailableWalletsChanged(wallets: WalletInfo[]) {
  const getAvailableWalletsChangedEvent = new CustomEvent(WalletEvent.AVAILABLE_WALLETS_CHANGED, {
    detail: { wallets },
  })
  window.dispatchEvent(getAvailableWalletsChangedEvent)
}
