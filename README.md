# Solana wallet adapter

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![turborepo](https://img.shields.io/badge/built%20with-turborepo-cc00ff.svg?style=for-the-badge&logo=turborepo)](https://turborepo.org/)

All-in-one framework agnostic solana wallet adapter library

## Supported Frameworks

- [x] React.js
  - [x] [Vite (@solana/web3.js v1.x.x)](/examples/react-vite-v1/README.md)
  - [x] [Vite (@solana/web3.js v2.x.x)](/examples/react-vite-v2/README.md)
  - [ ] Next.js (App directory)
  - [ ] Next.js (Pages directory)
  - [ ] Remix
  - [ ] Tanstack Start
- [x] Solid.js
  - [x] [SolidStart (@solana/web3.js v1.x.x)](/examples/solid-start-v1/README.md)
  - [x] [SolidStart (@solana/web3.js v2.x.x)](/examples/solid-start-v2/README.md)
- [x] Svelte
  - [x] [Sveltekit (@solana/web3.js v1.x.x)](/examples/sveltekit-v1/README.md)
  - [x] [Sveltekit (@solana/web3.js v2.x.x)](/examples/sveltekit-v2/README.md)
- [ ] Vue.js
- [ ] Qwik.js

## Known Issues

- android trezor connection not working
- android MWA send tx (devnet) not working
- web3js v1 hardware wallets not tested
- web3js v2 hardware wallets not working
- coinbase desktop + mobile send tx not working ("smth went wrong!")
- wallet account change detection not working properly
- custom ui component styling incomplete

## Directory Structure

- [`examples`](./examples) - example demo apps demonstrating wallet connection, sign message, send tx
- [`configs`](./configs) - internal configuration files for this monorepo
- [`packages`](./packages) - packages that are used within `apps` or `scripts`
  - [`core`](./packages/core) - internal core package containing wallet state management (via nanostores) + wallet-standard compatible wallet management
  - [`core-1.0`](./packages/core-1.0) - framework agnostic core package containing the `core` package + `@solana/web3.js` v1.x.x specific wallet actions
  - [`core-2.0`](./packages/core-2.0) - framework agnostic core package containing the `core` package + `@solana/web3.js` v2.x.x specific wallet actions
  - [`solid-1.0`](./packages/solid-1.0) - solid.js adapter for `core-1.0` package
  - [`solid-2.0`](./packages/solid-2.0) - solid.js adapter for `core-2.0` package
  - [`react-1.0`](./packages/react-1.0) - react.js adapter for `core-1.0` package
  - [`react-2.0`](./packages/react-2.0) - react.js adapter for `core-2.0` package

## Project Commands

List of cli commands available from a project root.

To use the commands, first install [pnpm](https://pnpm.io) and install dependencies with `pnpm i`.

```bash
pnpm run dev
# Builds all packages in watch mode, and starts all examples
# turbo run dev --parallel

pnpm run build
# Builds all the packages in the monorepo
# turbo run build --filter=!./examples/*

pnpm run test
# Runs tests for all the packages in the monorepo
# turbo run test --filter=!./examples/*

pnpm run typecheck
# Runs TS typecheck for all the packages in the monorepo
# turbo run typecheck --filter=!./examples/*

pnpm run build-test
# Runs build, typecheck and test commands for all the packages in the monorepo
# "turbo run build test typecheck --filter=!./examples/*

pnpm run format
# Formats the reposotory with prettier
# prettier -w \"packages/**/*.{js,ts,json,css,tsx,jsx,md}\" \"examples/**/*.{js,ts,json,css,tsx,jsx,md}\"

pnpm run changeset
# Creates a changeset
# changeset

pnpm run version-packages
# Applies changesets to bump package versions and update CHANGELOGs
# "changeset version && pnpm i

# NOTE: to publish scoped packages you must
# first create an org.
# @see https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
# 1. create an org in npmjs.com
# 2. login to npm via `npm login`
# 3. name org/scope according to package name
pnpm run release
# Builds and publishes changed packages to npm
# pnpm run build-test && changeset publish

pnpm run update-deps
# Updates all dependencies in the repository
# pnpm up -Lri
```
