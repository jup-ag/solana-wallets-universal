import { Component, ComponentProps, mergeProps } from "solid-js"

const ChevronLeftIcon: Component<ComponentProps<"svg">> = _props => {
  const props = mergeProps({ width: "8", height: "14" }, _props)
  return (
    <svg viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7 1L1 7L7 13"
        stroke="#1A202C"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

export default ChevronLeftIcon
