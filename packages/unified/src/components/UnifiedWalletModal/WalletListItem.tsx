import { Component, ComponentProps, createMemo, createSignal, mergeProps, Show } from "solid-js"
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"
import { isMobile } from "@solana-wallets-solid/core"
import { Dynamic } from "solid-js/web"

import UnknownIconSVG from "../../icons/UnknownWalletSVG"
import { useTranslation } from "../../contexts/translation/useTranslation"
import { WalletInfo } from "./types"

type WalletIconProps = {
  name: string
  icon: string
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
        when={props.icon && !hasError()}
        fallback={<UnknownIconSVG width={props.width} height={props.height} />}
      >
        <img
          onError={onError}
          width={props.width}
          height={props.height}
          src={props.icon}
          alt={`${props.name} icon`}
          class="object-contain"
        />
      </Show>
    </span>
  )
}

export type WalletListItemProps = {
  handleClick: ComponentProps<"button">["onClick"]
  info: WalletInfo
}

export const WalletListItem: Component<WalletListItemProps> = props => {
  // const { theme } = useUnifiedWallet()
  const { t } = useTranslation()
  const adapterName = createMemo(() => {
    if (props.info.type === "adapter") {
      if (props.info.adapter.name === SolanaMobileWalletAdapterWalletName) {
        return t(`Mobile`)
      }
      return props.info.adapter.name
    }
    return props.info.name
  })

  return (
    <li>
      <Dynamic
        component={props.info.type === "adapter" ? "button" : "a"}
        type="button"
        class="flex items-center w-full px-5 py-4 space-x-5 transition-all border rounded-lg cursor-pointer border-white/10 hover:bg-white/10 hover:backdrop-blur-xl hover:shadow-2xl bg-jupiter-bg text-white"
        onClick={props.info.type === "adapter" ? props.handleClick : undefined}
        href={props.info.type === "mobile-deeplink" ? props.info.deeplink : undefined}
        target={props.info.type === "mobile-deeplink" ? "_blank" : undefined}
      >
        <WalletIcon
          name={props.info.type === "adapter" ? props.info.adapter.name : props.info.name}
          icon={props.info.type === "adapter" ? props.info.adapter.icon : props.info.icon}
          width={isMobile() ? 24 : 30}
          height={isMobile() ? 24 : 30}
        />
        <span class="font-semibold text-xs overflow-hidden text-ellipsis">{adapterName()}</span>
      </Dynamic>
    </li>
  )
}
