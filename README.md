<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=your-repository-name&background=tiles&project=Monorepo" alt="your-repository-name Monorepo">
</p>

# Solana wallet adapter

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![turborepo](https://img.shields.io/badge/built%20with-turborepo-cc00ff.svg?style=for-the-badge&logo=turborepo)](https://turborepo.org/)

All-in-one framework agnostic solana wallet adapter library

> **Note** After using this template, you have to search and replace all `your-repository-name` and similar strings
> with appropriate texts.
>
> `your-repository-name` should be a **kebab-case** string representing the name of you monorepo.
>
> `your-repository-desc` should be a **Normal case** string with the description of the repository.
>
> `your-nickname` should be a **kebab-case** string from your profile URL.
>
> `your-author-name` should be a **Normal case** string with your first and last name.

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
