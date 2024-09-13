import { Component, createSignal } from "solid-js"
import { UnifiedWalletModalProps } from "."
import Dialog from "@corvu/dialog"
import CloseIcon from "../../icons/CloseIcon"

export const TestModal: Component<UnifiedWalletModalProps> = () => {
  const [isOpen, setIsOpen] = createSignal(true)

  return (
    <Dialog open={isOpen()} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />

        <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
          <Dialog.Content class="max-w-md w-full relative flex flex-col overflow-hidden rounded-xl max-h-[90vh] lg:max-h-[576px] transition-height duration-500 ease-in-out text-white bg-jupiter-bg">
            <div class="px-5 py-6 flex justify-between leading-none border-b border-b-white/10">
              <div>
                <div>
                  <Dialog.Label as="span" class="text-sm font-semibold h-min">
                    {`Connect Wallet`}
                  </Dialog.Label>
                </div>
                <div>
                  <Dialog.Description as="span" class="text-xs text-white/50 h-min">
                    {`You need to connect a Solana wallet.`}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close class="absolute top-4 right-4 bg-jupiter-bg">
                <CloseIcon width={12} height={12} />
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}
