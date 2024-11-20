import { Wallet } from "@wallet-standard/base"

import { AccountInfo, WalletInfo } from "./store"

/**
 * Expected info to be returned from a standard
 * wallet change event
 */
export type StandardChangeEventProperties = {
  readonly chains?: Wallet["chains"]
  readonly features?: Wallet["features"]
  readonly accounts?: Wallet["accounts"]
}

type ConnectStandardChangeEventProperties = {
  readonly accounts: Wallet["accounts"]
}

/**
 * Parse the changes from an emitted standard wallet
 * change event and determine the event type
 *
 * Supported event types for now are: `connect` and `disconnect`
 */
function isValidChangeEvent(
  event: StandardChangeEventProperties,
): event is ConnectStandardChangeEventProperties {
  // We currently do not support `features` / `chains`
  // related emitted standard events,
  if (event.features || event.chains || !event.accounts) {
    return false
  }

  // We assume the emitted event is a connection related
  // event if the `accounts` field is present
  return true
}

export function isConnectChangeEvent(
  event: StandardChangeEventProperties,
): event is ConnectStandardChangeEventProperties {
  return isValidChangeEvent(event) && event.accounts.length > 0
}

export function isDisconnectChangeEvent(
  event: StandardChangeEventProperties,
): event is ConnectStandardChangeEventProperties {
  return isValidChangeEvent(event) && event.accounts.length === 0
}

export const StandardEvent = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
} as const
export type StandardEvent = (typeof StandardEvent)[keyof typeof StandardEvent]

/**
 * Sends a `connect` event that gets picked up
 * by the event listener in context provider and
 * initiates connection to the wallet specified
 *
 * Used by custom UI elements for communicating
 * with the underlying wallet context provider
 * in a framework agnostic way
 */
export function dispatchConnect(payload: ConnectEventPayload) {
  console.log("dispatchConnect: connecting to: ", { payload })
  const connectEvent = new CustomEvent(WalletEvent.CONNECT, {
    detail: payload, // Optional additional data
  })
  window.dispatchEvent(connectEvent)
}
type ConnectEventPayload = { wallet: string }
export type ConnectEvent = CustomEvent<ConnectEventPayload>

/**
 * Notifies custom UI elements that a wallet
 * is currently being connected to
 *
 * Used by context providers to notify custom
 * UI elements in a framework agnostic way
 */
export function dispatchConnecting(payload: ConnectingEventPayload) {
  const connectingEvent = new CustomEvent(WalletEvent.CONNECTING, {
    detail: payload,
  })
  window.dispatchEvent(connectingEvent)
}
type ConnectingEventPayload = { connecting: boolean }
export type ConnectingEvent = CustomEvent<ConnectingEventPayload>

/**
 * Sends a `disconnect` event that gets picked up
 * by the event listener in context provider and
 * initiates disconnection to the wallet currently
 * connected
 *
 * Used by custom UI elements for communicating
 * with the underlying wallet context provider
 * in a framework agnostic way
 */
export function dispatchDisconnect() {
  console.log("dispatchDisconnect")
  const disconnectEvent = new CustomEvent(WalletEvent.DISCONNECT)
  window.dispatchEvent(disconnectEvent)
}

export function dispatchWalletChanged(payload: WalletChangedEventPayload) {
  console.log("dispatchWalletChanged: wallet changed: ", { payload })
  const getWalletChangedEvent = new CustomEvent(WalletEvent.WALLET_CHANGED, {
    detail: payload,
  })
  window.dispatchEvent(getWalletChangedEvent)
}
type WalletChangedEventPayload = {
  wallet?: AccountInfo | undefined
}
export type WalletChangedEvent = CustomEvent<WalletChangedEventPayload>

export function dispatchAvailableWalletsChanged(payload: AvailableWalletsChangedEventPayload) {
  const getAvailableWalletsChangedEvent = new CustomEvent(WalletEvent.AVAILABLE_WALLETS_CHANGED, {
    detail: payload,
  })
  window.dispatchEvent(getAvailableWalletsChangedEvent)
}
type AvailableWalletsChangedEventPayload = {
  wallets: WalletInfo[]
}
export type AvailableWalletsChangedEvent = CustomEvent<AvailableWalletsChangedEventPayload>

export function dispatchGetAvailableWallets() {
  const getAvailableWalletsEvent = new CustomEvent(WalletEvent.GET_AVAILABLE_WALLETS)
  window.dispatchEvent(getAvailableWalletsEvent)
}

export const WalletEvent = {
  CONNECT: "unified:connect",
  DISCONNECT: "unified:disconnect",
  CONNECTING: "unified:connecting",
  WALLET_CHANGED: "unified:wallet-changed",
  AVAILABLE_WALLETS_CHANGED: "unified:available-wallets-changed",
  GET_AVAILABLE_WALLETS: "unified:get-available-wallets",
} as const
