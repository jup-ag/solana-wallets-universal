import { defineConfig } from "@solidjs/start/config"

/**
 * Solid-start specific config file
 * @see https://docs.solidjs.com/solid-start/reference/config/define-config
 */
export default defineConfig({
  /**
   *	Toggle between client and server rendering.
   *	@default true
   */
  ssr: true,
  /**
   * Configuration object for [vite-plugin-solid](https://github.com/solidjs/vite-plugin-solid)
   */
  solid: {},
  /**
   * Array of file extensions to be treated as routes.
   * @default ["js", "jsx", "ts", "tsx"]
   */
  extensions: ["js", "jsx", "ts", "tsx"],
  /**
   * Nitro server config options
   *
   * @see https://nitro.unjs.io/config
   */
  server: {
    preset: "cloudflare-pages",
    alias: {
      // For `readable-stream` to properly resolve Cloudflare runtime polyfill
      "process/": "process",
    },
    esbuild: {
      options: {
        // We need BigInt support (default: 2019)
        target: "esnext",
      },
    },
  },
  /**
   * The path to the root of the application.
   *
   * @default "./src"
   */
  appRoot: "./src",
  /**
   * The path to where the routes are located.
   *
   * @default "./routes"
   */
  routeDir: "./routes",
  /**
   * The path to an optional middleware file.
   */
  middleware: undefined,
  /**
   * Toggle the dev overlay.
   *
   * @default true
   */
  devOverlay: true,
  experimental: {
    /**
     * Enable "islands" mode.
     */
    islands: false,
  },
  /**
   *	Vite config object. Can be configured for each router which has
   *	the string value "server", "client" or "server-function"`
   *
   *	@see https://vitejs.dev/config/shared-options.html
   */
  vite: {
    define: {
      // For WalletConnect
      // Node.js global to browser globalThis
      global: "globalThis",
    },
  },
})
