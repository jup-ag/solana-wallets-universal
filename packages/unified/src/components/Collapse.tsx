import {
  Component,
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  on,
  splitProps,
} from "solid-js"

type CollapseProps = ComponentProps<"div"> & {
  height: number | string
  maxHeight: string | number
  expanded: boolean
}
export const Collapse: Component<CollapseProps> = props => {
  const [localHeight, setLocalHeight] = createSignal<string | number>(props.height)
  const [local, rest] = splitProps(props, ["children", "height", "maxHeight", "expanded"])

  let el: HTMLDivElement | undefined

  const height = createMemo(() => props.height)
  const maxHeight = createMemo(() => props.maxHeight)
  const expanded = createMemo(() => props.expanded)
  createEffect(
    on([height, maxHeight, expanded], ([height, maxHeight, expanded]) => {
      setLocalHeight(expanded ? maxHeight : height)
    }),
  )
  createEffect(
    on(expanded, expanded => {
      const fadeInClass = "animate-fade-in"
      const fadeOutClass = "animate-fade-out"
      if (expanded) {
        el?.classList.add(fadeInClass)
        el?.classList.remove(fadeOutClass)
      } else {
        el?.classList.add(fadeOutClass)
        el?.classList.remove(fadeInClass)
      }
    }),
  )

  return (
    <div
      ref={e => (el = e)}
      class="transition-all duration-200 overflow-hidden"
      // classList={{
      //   "animate-fade-in": props.expanded,
      //   "animate-fade-out": !props.expanded,
      // }}
      style={{ height: localHeight()?.toString(), "max-height": props.maxHeight.toString() }}
      {...rest}
    >
      {local.children}
    </div>
  )
}
