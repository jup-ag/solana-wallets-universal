"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "unified-wallet-modal": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
    interface IntrinsicElements {
      "unified-wallet-modal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}

const ClientConnectButton: React.FC = () => {
  useEffect(() => {
    console.log("running on client!")
    const load = async () => {
      const { loadCustomElements } = await import("@solana-wallets/unified")
      loadCustomElements()
    }
    load()
  }, [])
  return <unified-wallet-modal-button />
}
const ConnectButton = dynamic(() => Promise.resolve(ClientConnectButton), {
  ssr: false,
})
export default ConnectButton
