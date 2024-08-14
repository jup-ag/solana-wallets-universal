import { Component, createEffect, JSXElement, Match, Show, Switch } from "solid-js"
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"

import { MWA_NOT_FOUND_ERROR, useUnifiedWallet } from "../contexts"
import { CurrentUserBadge } from "./CurrentUserBadge"

type Props = {
  overrideContent?: JSXElement
  buttonClassName?: string
  currentUserClassName?: string
}

export const UnifiedWalletButton: Component<Props> = props => {
  const { t, setShowModal, connect, connecting, connected, disconnect, adapter } =
    useUnifiedWallet()

  async function handleClick() {
    const _adapter = adapter()
    try {
      if (_adapter?.name === SolanaMobileWalletAdapterWalletName) {
        await connect()
        return
      } else {
        setShowModal(true)
      }
    } catch (error) {
      if (error instanceof Error && error.message === MWA_NOT_FOUND_ERROR) {
        setShowModal(true)
      }
    }
  }

  createEffect(() => {
    const _adapter = adapter()
    const _connected = connected()
    const displayConnectText = !!_adapter && !_connected
    console.log({ displayConnectText, adapter, connected: _connected })
  })

  return (
    <>
      <Switch>
        <Match when={adapter() && !!connected()}>
          <CurrentUserBadge onClick={disconnect} class={props.currentUserClassName} />
        </Match>
        <Match when={props.overrideContent}>
          <div
            class="bg-v3-bg text-white"
            // class={props.buttonClassName}
            onClick={handleClick}
          >
            {props.overrideContent}
          </div>
        </Match>
        <Match when={!props.overrideContent}>
          <button
            type="button"
            class="rounded-lg text-xs py-3 px-5 font-semibold cursor-pointer text-center w-auto bg-v3-bg text-white"
            // class={props.buttonClassName}
            onClick={handleClick}
          >
            <Show
              when={!connecting()}
              fallback={
                <span class="text-xs">
                  <span>{t(`Connecting...`)}</span>
                </span>
              }
            >
              <span class="block md:hidden">
                <span>{t(`Connect`)}</span>
              </span>

              <span class="hidden md:block">
                <span>{t(`Connect Wallet`)}</span>
              </span>
            </Show>
          </button>
        </Match>
      </Switch>
    </>
  )
}
