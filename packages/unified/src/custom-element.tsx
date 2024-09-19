import { customElement, noShadowDOM } from "solid-element"

import { UnifiedWalletModalProvider, UnifiedWalletProviderProps } from "./contexts"
import { UnifiedWalletButton, UnifiedWalletButtonProps } from "./components"

export function loadCustomElements() {
  customElement("unified-wallet-modal", (props: UnifiedWalletProviderProps, {}) => {
    noShadowDOM() // ... Solid code
    return <UnifiedWalletModalProvider {...props} />
  })
  customElement("unified-wallet-modal-button", (props: UnifiedWalletButtonProps, {}) => {
    noShadowDOM()
    return <UnifiedWalletButton {...props} />
  })
}
