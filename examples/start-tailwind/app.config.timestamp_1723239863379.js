// app.config.ts
import { defineConfig } from "@solidjs/start/config";
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
    /** CLOUDFLARE PRESET:
     * 1. uncomment the following
     * 2. Within wrangler.toml you will need to enable node compatibility: `compatibility_flags = [ "nodejs_compat" ]`
     */
    //   preset: "cloudflare_module",
    //   rollupConfig: {
    //     external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
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
    islands: false
  },
  /**
   *	Vite config object. Can be configured for each router which has
   *	the string value "server", "client" or "server-function"`
   *
   *	@see https://vitejs.dev/config/shared-options.html
   */
  vite: {}
});
export {
  app_config_default as default
};
