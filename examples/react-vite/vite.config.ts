import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tsPaths from "vite-tsconfig-paths"
import { nodePolyfills } from "vite-plugin-node-polyfills"

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    react(),
    tsPaths(),
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
        Buffer: true, // can also be 'build', 'dev', or false
      },
    }),
  ],
  build: {
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react/jsx-runtime"],
  },
})
