import { Component, JSXElement, Match, Show, Switch } from "solid-js"
// import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"
import { connect, disconnect } from "@solana-wallets-solid/core"

import { MWA_NOT_FOUND_ERROR, useUnifiedWallet } from "../contexts"
import { shortenAddress } from "../utils"

type Props = {
  overrideContent?: JSXElement
  buttonClassName?: string
  currentUserClassName?: string
}

export const UnifiedWalletButton: Component<Props> = props => {
  const { t, setShowModal, connecting, wallet, publicKey } = useUnifiedWallet()

  /**
   * Only attempt to connect if mobile wallet adapter already connected,
   * otherwise prompt user to select a wallet to connect to
   */
  async function handleConnect() {
    const _wallet = wallet()

    // if (!_adapter || _adapter.name !== SolanaMobileWalletAdapterWalletName) {
    if (!_wallet) {
      setShowModal(true)
      return
    }

    try {
      await connect(_wallet)
    } catch (err) {
      if (err instanceof Error && err.message === MWA_NOT_FOUND_ERROR) {
        setShowModal(true)
      } else {
        console.error("unknown error trying to connect to wallet: ", {
          err,
          _wallet,
        })
      }
    }
  }

  return (
    <>
      <Switch>
        <Match when={wallet() && publicKey()}>
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
