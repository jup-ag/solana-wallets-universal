import { Component, ComponentProps, mergeProps } from "solid-js"

const InfoIcon: Component<ComponentProps<"svg">> = _props => {
  const props = mergeProps({ width: "20", height: "20" }, _props)
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10 10C10.5523 10 11 10.4477 11 11V13C11 13.5523 10.5523 14 10 14C9.44772 14 9 13.5523 9 13V11C9 10.4477 9.44772 10 10 10Z"
        fill="currentColor"
      />
      <path
        d="M10 8C10.5523 8 11 7.55228 11 7C11 6.44772 10.5523 6 10 6C9.44772 6 9 6.44772 9 7C9 7.55228 9.44772 8 10 8Z"
        fill="currentColor"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10 3.5C6.41015 3.5 3.5 6.41015 3.5 10C3.5 13.5899 6.41015 16.5 10 16.5C13.5899 16.5 16.5 13.5899 16.5 10C16.5 6.41015 13.5899 3.5 10 3.5ZM2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default InfoIcon
