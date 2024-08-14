import { Component, ComponentProps, mergeProps } from "solid-js"

const SuccessIcon: Component<ComponentProps<"svg">> = _props => {
  const props = mergeProps({ width: "56", height: "56" }, _props)
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M28 0C12.5564 0 0 12.5564 0 28C0 43.4436 12.5564 56 28 56C43.4436 56 56 43.4436 56 28C56 12.5564 43.4436 0 28 0ZM42.1474 21.7504L27.1759 38.7874C26.6463 39.3768 25.9371 39.7315 25.1727 39.7315H25.0552C24.3483 39.7315 23.6414 39.4367 23.1095 38.9071L13.9703 29.7084C12.9088 28.6469 12.9088 26.8785 13.9703 25.8169C15.0318 24.7554 16.8002 24.7554 17.8617 25.8169L24.9956 32.9508L38.0218 18.0966C39.0234 16.9177 40.7918 16.8578 41.9132 17.8617C43.0922 18.8634 43.2089 20.5715 42.1474 21.7504Z"
        fill="#23C1AA"
      />
    </svg>
  )
}

export default SuccessIcon
