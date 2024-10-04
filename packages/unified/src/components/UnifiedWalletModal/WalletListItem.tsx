import { Component, ComponentProps, createMemo, createSignal, mergeProps, Show } from "solid-js"
import { isMobile, SolanaMobileWalletAdapterWalletName, WalletInfo } from "@solana-wallets/core-2.0"
import { Dynamic } from "solid-js/web"

import UnknownIconSVG from "../../icons/UnknownWalletSVG"
import { useTranslation } from "../../contexts/translation/useTranslation"

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
    if (props.info.wallet.name === SolanaMobileWalletAdapterWalletName) {
      return t(`Mobile`)
    }
    return props.info.wallet.name
  })

  return (
    <li>
      <Dynamic
        component={props.info.type !== "ios-webview" ? "button" : "a"}
        type="button"
        class="flex items-center w-full px-5 py-4 space-x-5 transition-all border rounded-lg cursor-pointer border-white/10 hover:bg-white/10 hover:backdrop-blur-xl hover:shadow-2xl bg-jupiter-bg text-white"
        onClick={props.info.type !== "ios-webview" ? props.handleClick : undefined}
        href={
          props.info.type === "ios-webview"
            ? props.info.wallet.deepUrl?.(window.location)
            : undefined
        }
        target={props.info.type === "ios-webview" ? "_blank" : undefined}
      >
        <WalletIcon
          name={props.info.wallet.name}
          icon={props.info.wallet.icon}
          width={isMobile() ? 24 : 30}
          height={isMobile() ? 24 : 30}
        />
        <span class="font-semibold text-xs overflow-hidden text-ellipsis">{adapterName()}</span>
      </Dynamic>
    </li>
  )
}
