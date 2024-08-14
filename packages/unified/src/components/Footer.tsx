import { Component, ComponentProps, mergeProps } from "solid-js"
import TwitterIcon from "../icons/TwitterIcon"
import DiscordIcon from "../icons/DiscordIcon"

const Footer: Component<ComponentProps<"footer">> = props => {
  props = mergeProps(
    { class: "flex text-center justify-center items-center p-2.5 text-xs text-white space-x-2" },
    props,
  )
  return (
    <footer {...props}>
      <a href="https://twitter.com/jupiterexchange" target="_blank">
        <TwitterIcon />
      </a>

      <a href="https://discord.gg/jup" target="_blank">
        <DiscordIcon />
      </a>
    </footer>
  )
}

export default Footer
