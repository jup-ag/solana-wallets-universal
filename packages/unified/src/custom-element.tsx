import { customElement, noShadowDOM } from "solid-element"
import UnifiedWalletModal, { UnifiedWalletModalProps } from "./components/UnifiedWalletModal/index"

export function loadCustomElements() {
  customElement("unified-wallet-modal", (props: UnifiedWalletModalProps, {}) => {
    noShadowDOM() // ... Solid code
    return (
      <UnifiedWalletModal
        showModal={props.showModal}
        setShowModal={props.setShowModal}
        walletPrecedence={props.walletPrecedence}
        getPreviouslyConnected={props.getPreviouslyConnected}
        wallets={props.wallets}
        onClose={props.onClose}
        isOpen={props.isOpen}
      />
    )
  })
}
