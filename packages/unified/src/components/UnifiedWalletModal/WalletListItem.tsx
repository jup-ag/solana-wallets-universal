import { Adapter } from "@solana/wallet-adapter-base"
import { Component, ComponentProps, createMemo, createSignal, mergeProps, Show } from "solid-js"
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"

import UnknownIconSVG from "../../icons/UnknownWalletSVG"
import { useTranslation } from "../../contexts/translation/useTranslation"
import { isMobile } from "../../utils"

type WalletIconProps = {
  wallet?: Adapter | undefined
  width?: number | undefined
  height?: number | undefined
}
export const WalletIcon: Component<WalletIconProps> = _props => {
  const props = mergeProps({ width: 24, height: 24 }, _props)
  const [hasError, setHasError] = createSignal(false)

  function onError() {
    setHasError(true)
  }

  return (
    <span style={{ "min-width": props.width.toString(), "min-height": props.height.toString() }}>
      <Show
        when={props.wallet && props.wallet.icon && !hasError()}
        fallback={<UnknownIconSVG width={props.width} height={props.height} />}
      >
        <img
          onError={onError}
          width={props.width}
          height={props.height}
          src={props.wallet!.icon}
          alt={`${props.wallet!.name} icon`}
          class="object-contain"
        />
      </Show>
    </span>
  )
}

export type WalletListItemProps = {
  handleClick: ComponentProps<"button">["onClick"]
  adapter: Adapter
}

export const WalletListItem: Component<WalletListItemProps> = props => {
  // const { theme } = useUnifiedWallet()
  const { t } = useTranslation()
  const adapterName = createMemo(() => {
    if (!props.adapter) {
      return ""
    }
    if (props.adapter.name === SolanaMobileWalletAdapterWalletName) {
      return t(`Mobile`)
    }
    return props.adapter.name
  })

  return (
    <li>
      <button
        type="button"
        onClick={props.handleClick}
        class="flex items-center w-full px-5 py-4 space-x-5 transition-all border rounded-lg cursor-pointer border-white/10 hover:bg-white/10 hover:backdrop-blur-xl hover:shadow-2xl bg-jupiter-bg text-white"
        // classList={{
        //   "bg-gray-50 hover:shadow-lg hover:border-black/10": theme === "light",
        //   "hover:shadow-2xl hover:bg-white/10": theme !== "light",
        // }}
      >
        <WalletIcon
          wallet={props.adapter}
          width={isMobile() ? 24 : 30}
          height={isMobile() ? 24 : 30}
        />
        <span class="font-semibold text-xs overflow-hidden text-ellipsis">{adapterName()}</span>
      </button>
    </li>
  )
}
