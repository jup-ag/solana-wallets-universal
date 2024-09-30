// vite.config.ts
import { defineConfig } from "file:///Users/aidan/projects/solana-wallets-solid/node_modules/.pnpm/vite@5.4.6_@types+node@20.16.5_lightningcss@1.27.0_terser@5.31.6/node_modules/vite/dist/node/index.js";
import react from "file:///Users/aidan/projects/solana-wallets-solid/node_modules/.pnpm/@vitejs+plugin-react-swc@3.7.0_@swc+helpers@0.5.12_vite@5.4.6_@types+node@20.16.5_lightningcss@1.27.0_terser@5.31.6_/node_modules/@vitejs/plugin-react-swc/index.mjs";
import tsPaths from "file:///Users/aidan/projects/solana-wallets-solid/node_modules/.pnpm/vite-tsconfig-paths@5.0.1_typescript@5.6.2_vite@5.4.6_@types+node@20.16.5_lightningcss@1.27.0_terser@5.31.6_/node_modules/vite-tsconfig-paths/dist/index.js";
import { nodePolyfills } from "file:///Users/aidan/projects/solana-wallets-solid/node_modules/.pnpm/vite-plugin-node-polyfills@0.22.0_rollup@4.21.0_vite@5.4.6_@types+node@20.16.5_lightningcss@1.27.0_terser@5.31.6_/node_modules/vite-plugin-node-polyfills/dist/index.js";
var vite_config_default = defineConfig({
  server: {
    port: 5173
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
        Buffer: true
        // can also be 'build', 'dev', or false
      }
    })
  ],
  build: {
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "hardware-wallet": ["@solana/wallet-adapter-trezor", "@solana/wallet-adapter-ledger"]
        }
      }
    }
  },
  optimizeDeps: {
    include: ["react/jsx-runtime"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWlkYW4vcHJvamVjdHMvc29sYW5hLXdhbGxldHMtc29saWQvZXhhbXBsZXMvcmVhY3Qtdml0ZS12MVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2FpZGFuL3Byb2plY3RzL3NvbGFuYS13YWxsZXRzLXNvbGlkL2V4YW1wbGVzL3JlYWN0LXZpdGUtdjEvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2FpZGFuL3Byb2plY3RzL3NvbGFuYS13YWxsZXRzLXNvbGlkL2V4YW1wbGVzL3JlYWN0LXZpdGUtdjEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiXG5pbXBvcnQgdHNQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSBcInZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzXCJcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgdHNQYXRocygpLFxuICAgIC8vIFJlcXVpcmVkIGZvciBgc2VuZFR4YCB0byB3b3JrXG4gICAgbm9kZVBvbHlmaWxscyh7XG4gICAgICAvLyAgIC8vIFRvIGFkZCBvbmx5IHNwZWNpZmljIHBvbHlmaWxscywgYWRkIHRoZW0gaGVyZS4gSWYgbm8gb3B0aW9uIGlzIHBhc3NlZCwgYWRkcyBhbGwgcG9seWZpbGxzXG4gICAgICBpbmNsdWRlOiBbXCJidWZmZXJcIl0sXG4gICAgICAvLyAgIC8vIFRvIGV4Y2x1ZGUgc3BlY2lmaWMgcG9seWZpbGxzLCBhZGQgdGhlbSB0byB0aGlzIGxpc3QuIE5vdGU6IGlmIGluY2x1ZGUgaXMgcHJvdmlkZWQsIHRoaXMgaGFzIG5vIGVmZmVjdFxuICAgICAgLy8gICAvLyBleGNsdWRlOiBbXG4gICAgICAvLyAgIC8vICAgXCJodHRwXCIsIC8vIEV4Y2x1ZGVzIHRoZSBwb2x5ZmlsbCBmb3IgYGh0dHBgIGFuZCBgbm9kZTpodHRwYC5cbiAgICAgIC8vICAgLy8gXSxcbiAgICAgIC8vIFdoZXRoZXIgdG8gcG9seWZpbGwgc3BlY2lmaWMgZ2xvYmFscy5cbiAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgQnVmZmVyOiB0cnVlLCAvLyBjYW4gYWxzbyBiZSAnYnVpbGQnLCAnZGV2Jywgb3IgZmFsc2VcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgY3NzTWluaWZ5OiBcImxpZ2h0bmluZ2Nzc1wiLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICBcInJlYWN0LXZlbmRvclwiOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0LXJvdXRlci1kb21cIl0sXG4gICAgICAgICAgXCJoYXJkd2FyZS13YWxsZXRcIjogW1wiQHNvbGFuYS93YWxsZXQtYWRhcHRlci10cmV6b3JcIiwgXCJAc29sYW5hL3dhbGxldC1hZGFwdGVyLWxlZGdlclwiXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1wicmVhY3QvanN4LXJ1bnRpbWVcIl0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxWCxTQUFTLG9CQUFvQjtBQUNsWixPQUFPLFdBQVc7QUFDbEIsT0FBTyxhQUFhO0FBQ3BCLFNBQVMscUJBQXFCO0FBRTlCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUE7QUFBQSxJQUVSLGNBQWM7QUFBQTtBQUFBLE1BRVosU0FBUyxDQUFDLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFNbEIsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBO0FBQUEsTUFDVjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxtQkFBbUIsQ0FBQyxpQ0FBaUMsK0JBQStCO0FBQUEsUUFDdEY7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxtQkFBbUI7QUFBQSxFQUMvQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
