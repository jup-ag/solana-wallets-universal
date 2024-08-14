import { Component, ComponentProps } from "solid-js"

const ChevronDownSolidIcon: Component<ComponentProps<"svg">> = props => {
  return (
    <svg viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8.5 9.87695L4.5 5.87695H12.5L8.5 9.87695Z" fill="currentColor" />
    </svg>
  )
}

export default ChevronDownSolidIcon
