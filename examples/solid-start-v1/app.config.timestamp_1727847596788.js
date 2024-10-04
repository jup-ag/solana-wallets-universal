// app.config.ts
import { defineConfig } from "@solidjs/start/config"
import { nodePolyfills } from "vite-plugin-node-polyfills"
var app_config_default = defineConfig({
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
  middleware: void 0,
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
      // global: "globalThis",
    },
    build: {
      rollupOptions: {
        output: {
          // manualChunks: {
          //   "hardware-wallet": ["@solana/wallet-adapter-trezor", "@solana/wallet-adapter-ledger"],
          // },
          manualChunks: id => {
            if (id.includes("ledger") || id.includes("trezor")) {
              return "hardware-wallet"
            }
          },
        },
      },
    },
    plugins: [
      // Required for `sendTx` to work
      nodePolyfills({
        //   // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
        include: ["buffer"],
        //   // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
        //   // exclude: [
        //   //   "http", // Excludes the polyfill for `http` and `node:http`.
        //   // ],
        // Whether to polyfill specific globals.
        globals: {
          Buffer: true,
          // can also be 'build', 'dev', or false
        },
      }),
    ],
  },
})
export { app_config_default as default }
