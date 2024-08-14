import { Component, ComponentProps, createEffect, Show } from "solid-js"
import { shortenAddress, useUnifiedWallet } from "../contexts"

type Props = ComponentProps<"button">

export const CurrentUserBadge: Component<Props> = props => {
  const { adapter, publicKey } = useUnifiedWallet()

  createEffect(() => {
    console.log({ adapter: adapter(), pubKey: publicKey() })
  })

  return (
    <Show when={adapter() && publicKey()}>
      <button
        {...props}
        type="button"
        class="flex items-center py-2 px-3 rounded-2xl h-7 cursor-pointer bg-v3-bg text-white"
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
    </Show>
  )
}
