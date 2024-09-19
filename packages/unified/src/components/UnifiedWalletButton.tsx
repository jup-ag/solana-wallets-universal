import {
  Component,
  createMemo,
  createSignal,
  JSXElement,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js"
// import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"
import {
  dispatchConnect,
  dispatchDisconnect,
  StandardWalletConnectResult,
  WalletChangedEvent,
  ConnectingEvent,
  WalletEvent,
} from "@solana-wallets-solid/core"

import { dispatchUpdateModal, MWA_NOT_FOUND_ERROR, useUnifiedWallet } from "../contexts"
import { shortenAddress } from "../utils"

export type UnifiedWalletButtonProps = {
  overrideContent?: JSXElement
  buttonClassName?: string
  currentUserClassName?: string
}

export const UnifiedWalletButton: Component<UnifiedWalletButtonProps> = props => {
  // const { t, setOpen, wallet, name, publicKey, connecting } = useUnifiedWallet()

  const [wallet, setWallet] = createSignal<StandardWalletConnectResult>()
  const [connecting, setConnecting] = createSignal<boolean>(false)
  const name = createMemo(() => wallet()?.name)
  const publicKey = createMemo(() => wallet()?.pubKey)

  /**
   * Only attempt to connect if mobile wallet adapter already connected,
   * otherwise prompt user to select a wallet to connect to
   */
  async function handleConnect() {
    const walletName = name()

    // if (!_adapter || _adapter.name !== SolanaMobileWalletAdapterWalletName) {
    if (!walletName) {
      dispatchUpdateModal(true)
      return
    }

    try {
      dispatchConnect(walletName)
    } catch (err) {
      if (err instanceof Error && err.message === MWA_NOT_FOUND_ERROR) {
        dispatchUpdateModal(true)
      } else {
        console.error("unknown error trying to connect to wallet: ", {
          err,
          walletName,
        })
      }
    } finally {
      dispatchUpdateModal(false)
    }
  }

  function onWalletChangedHandler(event: Event) {
    const walletChangedEvent = event as WalletChangedEvent
    setWallet(walletChangedEvent.detail.wallet)
  }

  function onWalletConnectingHandler(event: Event) {
    const walletConnectingEvent = event as ConnectingEvent
    setConnecting(walletConnectingEvent.detail.connecting)
  }

  onMount(() => {
    window.addEventListener(WalletEvent.WALLET_CHANGED, onWalletChangedHandler)
    window.addEventListener(WalletEvent.CONNECTING, onWalletConnectingHandler)
    onCleanup(() => {
      window.removeEventListener(WalletEvent.WALLET_CHANGED, onWalletChangedHandler)
      window.removeEventListener(WalletEvent.CONNECTING, onWalletConnectingHandler)
    })
  })

  return (
    <>
      <Switch>
        <Match when={name() && publicKey()}>
          <button
            type="button"
            class="flex items-center py-2 px-3 rounded-2xl h-7 cursor-pointer bg-v3-bg text-white w-auto"
            onClick={dispatchDisconnect}
            // class={props.currentUserClassName}
          >
            <span
              class="w-4 h-4 rounded-full flex justify-center items-center"
              style={{ position: "relative" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Wallet logo" width={16} height={16} src={wallet()?.icon} />
            </span>

            <span class="ml-2 text-xs text-white">{shortenAddress(`${publicKey()}`)}</span>
          </button>
        </Match>
        <Match when={props.overrideContent}>
          <div
            class="bg-v3-bg text-white"
            // class={props.buttonClassName}
            onClick={handleConnect}
          >
            {props.overrideContent}
          </div>
        </Match>
        <Match when={!props.overrideContent}>
          <button
            type="button"
            class="rounded-lg text-xs py-3 px-5 font-semibold cursor-pointer text-center w-auto bg-v3-bg text-white"
            // class={props.buttonClassName}
            onClick={handleConnect}
          >
            <Show
              when={!connecting()}
              fallback={
                <span class="text-xs">
                  <span>{`Connecting...`}</span>
                </span>
              }
            >
              <span class="block md:hidden">
                <span>{`Connect`}</span>
              </span>

              <span class="hidden md:block">
                <span>{`Connect Wallet`}</span>
              </span>
            </Show>
          </button>
        </Match>
      </Switch>
    </>
  )
}
