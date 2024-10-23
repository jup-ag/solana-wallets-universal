/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "jupiter-input-light": "#EBEFF1",
        "jupiter-bg": "#313E4C",
        "jupiter-dark-bg": "#3A3B43",
        "jupiter-light-bg": "#fff",
        "jupiter-jungle-green": "#24AE8F",
        "jupiter-primary": "#FBA43A",
        warning: "#FAA63C",

        "v2-primary": "rgba(199, 242, 132, 1)",
        "v2-background": "#304256",
        "v2-background-dark": "#19232D",
        "v2-lily": "#E8F9FF",

        "v3-bg": "rgba(28, 41, 54, 1)",
        "v3-primary": "#c7f284",
      },
      transitionProperty: {
        height: "height",
        "max-height": "max-height",
      },
      keyframes: {
        "fade-in": {
          "0%": {
            opacity: "0.2",
          },
          "100%": {
            opacity: "1",
          },
        },
        "fade-out": {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-in-out",
        "fade-out": "fade-out 0.15s ease-out",
        shine: "shine 3.5s linear infinite",
        hue: "hue 10s infinite linear",
      },
      backgroundImage: {
        "v2-text-gradient": "linear-gradient(247.44deg, #C7F284 13.88%, #00BEF0 99.28%)",
      },
    },
  },
  variants: {
    extend: {
      // Enable dark mode, hover, on backgroundImage utilities
      backgroundImage: ["dark", "hover", "focus-within", "focus"],
    },
  },
  corePlugins: {
    preflight: false,
  },
  // prefix: "unified",
  plugins: [],
}
