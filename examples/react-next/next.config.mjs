/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverExternalPackages: ["@solana-wallets-solid/unified"],
  experimental: {
    serverComponentsExternalPackages: ["@solana-wallets-solid/unified"],
  },
}

export default nextConfig
