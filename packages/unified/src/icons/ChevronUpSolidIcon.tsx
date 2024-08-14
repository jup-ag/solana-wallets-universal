import { Component, ComponentProps } from "solid-js"

const ChevronUpSolidIcon: Component<ComponentProps<"svg">> = props => {
  return (
    <svg viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 0.654296L10 5.6543L2.38419e-07 5.6543L5 0.654296Z" fill="currentColor" />
    </svg>
  )
}

export default ChevronUpSolidIcon
