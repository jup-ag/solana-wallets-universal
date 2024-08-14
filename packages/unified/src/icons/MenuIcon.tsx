import { Component, ComponentProps } from "solid-js"

const MenuIcon: Component<ComponentProps<"svg">> = _props => {
  return (
    <svg
      width="24"
      height="25"
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {..._props}
    >
      <path
        d="M4 6.01263H20M4 12.0126H20M4 18.0126H20"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

export default MenuIcon
