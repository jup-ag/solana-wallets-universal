import { WalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base"
import { Component } from "solid-js"

import { useUnifiedWallet } from "../../contexts"
import ExternalIcon from "../../icons/ExternalIcon"

type NotInstalledProps = {
  wallet: WalletAdapterCompatibleStandardWallet
  onClose: () => void
  onGoOnboarding: () => void
}
export const NotInstalled: Component<NotInstalledProps> = props => {
  const { t } = useUnifiedWallet()

  return (
    <div class="hideScrollbar duration-500 animate-fade-in overflow-y-scroll">
      <div class="flex flex-col justify-center items-center p-5">
        <img src={props.wallet.icon} width={100} height={100} />
      </div>

      <div class="flex flex-col justify-center items-center text-center">
        <span class="text-base font-semibold">
          {t(`Have you installed`) + ` ${props.wallet.name}?`}
        </span>
        <a
          // href={props.wallet.url}
          rel="noopener noreferrer"
          target="_blank"
          class="text-xs flex my-3 items-center space-x-2 underline"
        >
          <span>
            {t(`Install`)} {props.wallet.name}
          </span>

          <ExternalIcon />
        </a>
        <div class="mt-5 flex w-full px-10 flex-col items-start justify-start text-start">
          <p class="text-xs font-semibold">{t(`On mobile:`)}</p>
          <ul class="text-xs pl-8 mt-2 list-disc">
            <li>{t(`You should open the app instead`)}</li>
          </ul>
        </div>
        <div class="mt-5 flex w-full px-10 flex-col items-start justify-start text-start">
          <p class="text-xs font-semibold">{t(`On desktop:`)}</p>
          <ul class="text-xs pl-8 mt-2 list-disc">
            <li>{t(`Install and refresh the page`)}</li>
          </ul>
        </div>
        <div class="border-t border-t-white/10 mt-5 w-full" />
        ``
        <div class="flex space-x-2 justify-between w-full p-5">
          <button
            type="button"
            class={`text-white font-semibold text-base w-full rounded-lg border border-white/10 px-2 py-4 leading-none bg-black hover:bg-black/50`}
            // classList={{
            //   "bg-[#31333B] text-white hover:bg-black": theme === "light",
            //   "bg-[#31333B] hover:bg-black/30": theme === "dark",
            //   "bg-black hover:bg-black/50": theme === "jupiter",
            // }}
            onClick={() => props.onGoOnboarding()}
          >
            {t(`I don't have a wallet`)}
          </button>

          <button
            type="button"
            class={`text-white font-semibold text-base w-full rounded-lg border border-white/10 px-2 py-4 leading-none bg-black hover:bg-black/50`}
            // classList={{
            //   "bg-[#31333B] text-white hover:bg-black": theme === "light",
            //   "bg-[#31333B] hover:bg-black/30": theme === "dark",
            //   "bg-black hover:bg-black/50": theme === "jupiter",
            // }}
            onClick={() => props.onClose()}
          >
            {"← " + t(`Go back`)}
          </button>
        </div>
      </div>
    </div>
  )
}
