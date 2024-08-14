import { Component, ComponentProps, mergeProps } from "solid-js"

const JupiterLogo: Component<ComponentProps<"img">> = _props => {
  const props = mergeProps({ width: 24, height: 24 }, _props)
  return <img src={"https://jup.ag/svg/jupiter-logo.svg"} alt="Jupiter aggregator" {...props} />
}

export default JupiterLogo
