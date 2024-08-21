import { Component, JSXElement, Match, Show, Switch } from "solid-js"
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"

import { MWA_NOT_FOUND_ERROR, useUnifiedWallet } from "../contexts"
import { shortenAddress } from "../utils"

type Props = {
  overrideContent?: JSXElement
  buttonClassName?: string
  currentUserClassName?: string
}

export const UnifiedWalletButton: Component<Props> = props => {
  const { t, setShowModal, connect, connecting, disconnect, adapter, publicKey } =
    useUnifiedWallet()

  /**
   * Only attempt to connect if mobile wallet adapter already connected,
   * otherwise prompt user to select a wallet to connect to
   */
  async function handleConnect() {
    const _adapter = adapter()

    if (!_adapter || _adapter.name !== SolanaMobileWalletAdapterWalletName) {
      console.error("showing modal due to missing adapter")
      setShowModal(true)
      return
    }

    try {
      await connect(_adapter)
    } catch (err) {
      if (err instanceof Error && err.message === MWA_NOT_FOUND_ERROR) {
        console.error("showing modal due to mwa_not_found_error")
        setShowModal(true)
      } else {
        console.error("unknown error trying to connect to mobile wallet adapter: ", {
          err,
          _adapter,
        })
      }
    }
  }

  return (
    <>
      <Switch>
        <Match when={adapter() && publicKey()}>
          <button
            type="button"
            class="flex items-center py-2 px-3 rounded-2xl h-7 cursor-pointer bg-v3-bg text-white w-auto"
            onClick={disconnect}
            // class={props.currentUserClassName}
          >
            <span
              class="w-4 h-4 rounded-full flex justify-center items-center"
              style={{ position: "relative" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Wallet logo" width={16} height={16} src={adapter()?.icon} />
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
