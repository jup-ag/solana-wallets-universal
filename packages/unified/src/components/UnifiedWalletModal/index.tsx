import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSXElement,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
} from "solid-js"
import Dialog from "@corvu/dialog"
import { Adapter, WalletName, WalletReadyState } from "@solana/wallet-adapter-base"
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"

import { useUnifiedWallet } from "../../contexts"
import CloseIcon from "../../icons/CloseIcon"
import { OnboardingFlow } from "./Onboarding"
import { NotInstalled } from "./NotInstalled"
import { isMobile } from "../../utils"
import { WalletIcon, WalletListItem } from "./WalletListItem"
import ChevronUpIcon from "../../icons/ChevronUpIcon"
import ChevronDownIcon from "../../icons/ChevronDownIcon"
import { Collapse } from "../Collapse"

type HeaderProps = {
  onClose: () => void
}
export const Header: Component<HeaderProps> = props => {
  const { t } = useUnifiedWallet()

  return (
    <div
      class="px-5 py-6 flex justify-between leading-none"
      // classList={{
      //   "border-b": theme === "light",
      // }}
    >
      <div>
        <div class="font-semibold">
          <span>{t(`Connect Wallet`)}</span>
        </div>
        <div
          class="text-xs mt-1 text-white/50"
          // classList={{
          //   "text-black/50": theme === "light",
          //   "text-white/50": theme !== "light",
          // }}
        >
          <span>{t(`You need to connect a Solana wallet.`)}</span>
        </div>
      </div>

      <button class="absolute top-4 right-4" onClick={() => props.onClose()}>
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  )
}

type ListOfWalletsProps = {
  list: {
    highlightedBy: HIGHLIGHTED_BY
    highlight: Adapter[]
    others: Adapter[]
  }
  onToggle: (nextValue?: any) => void
  isOpen: boolean
}
export const ListOfWallets: Component<ListOfWalletsProps> = props => {
  const { t, walletlistExplanation, walletAttachments, handleConnectClick } = useUnifiedWallet()
  const [showOnboarding, setShowOnboarding] = createSignal(false)
  const [showNotInstalled, setShowNotInstalled] = createSignal<Adapter | false>(false)

  const list = createMemo(() => props.list)
  const hasNoWallets = createMemo(() => {
    return list().highlight.length + list().others.length === 0
  })

  async function onWalletClick(adapter: Adapter) {
    if (adapter.readyState === WalletReadyState.NotDetected) {
      setShowNotInstalled(adapter)
      return
    }
    await handleConnectClick(adapter)
  }

  let othersListEl: HTMLDivElement | undefined
  const numOthers = createMemo(() => list().others.length)
  createEffect(
    on(numOthers, numOthers => {
      const classText = "mb-8"
      if (numOthers > 6) {
        othersListEl?.classList.add(classText)
      } else {
        othersListEl?.classList.remove(classText)
      }
    }),
  )

  createEffect(() => {
    if (hasNoWallets()) {
      setShowOnboarding(true)
    }
  })

  return (
    <>
      <Show
        when={!showOnboarding() && !showNotInstalled()}
        fallback={
          <>
            <Switch>
              <Match when={showOnboarding()}>
                <OnboardingFlow showBack={!hasNoWallets} onClose={() => setShowOnboarding(false)} />
              </Match>
              <Match when={showNotInstalled()}>
                {_showNotInstalled => (
                  <NotInstalled
                    adapter={_showNotInstalled()}
                    onClose={() => setShowNotInstalled(false)}
                    onGoOnboarding={() => {
                      setShowOnboarding(true)
                      setShowNotInstalled(false)
                    }}
                  />
                )}
              </Match>
            </Switch>
          </>
        }
      >
        <div class="hideScrollbar h-full overflow-y-scroll pt-2 pb-8 px-5 relative">
          <span class="text-xs font-semibold">
            <Switch>
              <Match when={list().highlightedBy === "PreviouslyConnected"}>
                {t(`Recently used`)}
              </Match>
              <Match when={list().highlightedBy === "TopAndRecommended"}>
                {t(`Recommended wallets`)}
              </Match>
            </Switch>
          </span>
          <div class="mt-4 flex flex-col space-y-2">
            <For each={list().highlight}>
              {adapter => {
                const adapterName = createMemo(() => {
                  if (adapter.name === SolanaMobileWalletAdapterWalletName) {
                    return t(`Mobile`)
                  }
                  return adapter.name
                })
                const attachment = walletAttachments
                  ? walletAttachments[adapter.name]?.attachment
                  : null
                return (
                  <button
                    type="button"
                    onClick={() => onWalletClick(adapter)}
                    class="py-4 px-4 border border-white/10 rounded-lg flex items-center cursor-pointer flex-1 hover:backdrop-blur-xl transition-all hover:shadow-2xl hover:bg-white/10 bg-jupiter-bg"
                    // classList={{
                    //   "bg-gray-50 hover:shadow-lg hover:border-black/10": theme === "light",
                    //   "hover:shadow-2xl hover:bg-white/10": theme !== "light",
                    // }}
                  >
                    <WalletIcon
                      wallet={adapter}
                      width={isMobile() ? 24 : 30}
                      height={isMobile() ? 24 : 30}
                    />
                    <span class="font-semibold text-xs ml-4 text-white">{adapterName()}</span>
                    <Show when={attachment}>{_attachment => <div>{_attachment()}</div>}</Show>
                  </button>
                )
              }}
            </For>
          </div>
          <Show when={walletlistExplanation && list().others.length === 0}>
            <div class="text-xs font-semibold mt-4 -mb-2 text-white/80 underline cursor-pointer">
              <a href={walletlistExplanation?.href} target="_blank" rel="noopener noreferrer">
                <span>{t(`Can't find your wallet?`)}</span>
              </a>
            </div>
          </Show>

          <Show when={list().others.length > 0}>
            <>
              <button
                type="button"
                class="mt-5 flex w-full items-center justify-between cursor-pointer"
                onClick={() => props.onToggle()}
              >
                <span class="text-xs font-semibold">
                  <span
                    class="text-white"
                    // classList={{ "text-black": theme === "light", "text-white": theme !== "light" }}
                  >
                    {t(`More wallets`)}
                  </span>
                </span>

                <span class="w-[10px] h-[6px]">
                  <Show when={props.isOpen} fallback={<ChevronDownIcon />}>
                    <ChevronUpIcon />
                  </Show>
                </span>
              </button>

              <Collapse height={0} maxHeight={"auto"} expanded={props.isOpen}>
                <div>
                  <div class="mt-4 grid gap-2 grid-cols-2 pb-4" translate="no">
                    <For each={list().others}>
                      {adapter => (
                        <ul>
                          <WalletListItem
                            handleClick={() => onWalletClick(adapter)}
                            adapter={adapter}
                          />
                        </ul>
                      )}
                    </For>
                  </div>
                  <Show when={list().highlightedBy !== "Onboarding" && walletlistExplanation}>
                    <div
                      ref={e => (othersListEl = e)}
                      class="text-xs font-semibold underline"
                      // classList={{
                      //   "mb-8": list().others.length > 6,
                      // }}
                    >
                      <a
                        href={walletlistExplanation?.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{t(`Can't find your wallet?`)}</span>
                      </a>
                    </div>
                  </Show>
                </div>
              </Collapse>
            </>
          </Show>

          <div class="text-xs font-semibold mt-4 -mb-2 text-white/80 underline cursor-pointer">
            <button class="bg-jupiter-bg" type="button" onClick={() => setShowOnboarding(true)}>
              <span
                class="text-white"
                // classList={{ "text-black": theme === "light", "text-white": theme !== "light" }}
              >
                {t(`I don't have a wallet`)}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Shades */}
        <Show when={props.isOpen && list().others.length > 6}>
          <>
            <div
              class="block w-full h-20 absolute left-0 bottom-7 z-50 bg-gradient-to-t from-jupiter-bg to-transparent pointer-events-none"
              // classList={{
              //   "bg-gradient-to-t from-[#ffffff] to-transparent pointer-events-none":
              //     theme === "light",
              //   "bg-gradient-to-t from-[#3A3B43] to-transparent pointer-events-none":
              //     theme === "dark",
              //   "bg-gradient-to-t from-[rgb(49, 62, 76)] to-transparent pointer-events-none":
              //     theme === "jupiter",
              // }}
            />
          </>
        </Show>
      </Show>
    </>
  )
}

export const PRIORITISE: {
  [value in WalletReadyState]: number
} = {
  [WalletReadyState.Installed]: 1,
  [WalletReadyState.Loadable]: 2,
  [WalletReadyState.NotDetected]: 3,
  [WalletReadyState.Unsupported]: 3,
}
export type WalletModalProps = {
  className?: string
  logo?: JSXElement
  container?: string
}

type HIGHLIGHTED_BY =
  | "PreviouslyConnected" // last connected
  | "TopAndRecommended" // Installed, and top wallets
  | "Onboarding"
  | "TopWallet"
export const TOP_WALLETS: WalletName[] = [
  "Phantom" as WalletName<"Phantom">,
  "Solflare" as WalletName<"Solflare">,
  "Backpack" as WalletName<"Backpack">,
]

export const sortByPrecedence = (walletPrecedence: WalletName[]) => (a: Adapter, b: Adapter) => {
  if (!walletPrecedence) return 0

  const aIndex = walletPrecedence.indexOf(a.name)
  const bIndex = walletPrecedence.indexOf(b.name)

  if (aIndex === -1 && bIndex === -1) return 0
  if (aIndex >= 0) {
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }

  if (bIndex >= 0) {
    if (aIndex === -1) return 1
    return bIndex - aIndex
  }
  return 0
}

export function clickOutside(el: Element, handler: () => void) {
  const onClick = (e: MouseEvent & { target: any }) => !el.contains(e.target) && handler()
  document.body.addEventListener("click", onClick)

  onCleanup(() => document.body.removeEventListener("click", onClick))
}

export type UnifiedWalletModalProps = {
  onClose: () => void
}

export const UnifiedWalletModal: Component<UnifiedWalletModalProps> = () => {
  const { t, wallets, getPreviouslyConnected, walletPrecedence, showModal, setShowModal } =
    useUnifiedWallet()
  const [isOpen, setIsOpen] = createSignal(false)

  const list = createMemo<{
    highlightedBy: HIGHLIGHTED_BY
    highlight: Adapter[]
    others: Adapter[]
  }>(() => {
    // Then, Installed, Top 3, Loadable, NotDetected
    const filteredAdapters = wallets.reduce<{
      previouslyConnected: Adapter[]
      installed: Adapter[]
      top3: Adapter[]
      loadable: Adapter[]
      notDetected: Adapter[]
    }>(
      (acc, wallet) => {
        const adapterName = wallet.adapter.name

        // Previously connected takes highest
        const previouslyConnectedIndex = getPreviouslyConnected().indexOf(adapterName)
        if (previouslyConnectedIndex >= 0) {
          acc.previouslyConnected[previouslyConnectedIndex] = wallet.adapter
          return acc
        }
        // Then Installed
        if (wallet.readyState === WalletReadyState.Installed) {
          acc.installed.push(wallet.adapter)
          return acc
        }
        // Top 3
        const topWalletsIndex = TOP_WALLETS.indexOf(adapterName)
        if (topWalletsIndex >= 0) {
          acc.top3[topWalletsIndex] = wallet.adapter
          return acc
        }
        // Loadable
        if (wallet.readyState === WalletReadyState.Loadable) {
          acc.loadable.push(wallet.adapter)
          return acc
        }
        // NotDetected
        if (wallet.readyState === WalletReadyState.NotDetected) {
          acc.loadable.push(wallet.adapter)
          return acc
        }
        return acc
      },
      {
        previouslyConnected: [],
        installed: [],
        top3: [],
        loadable: [],
        notDetected: [],
      },
    )

    if (filteredAdapters.previouslyConnected.length > 0) {
      const { previouslyConnected, ...rest } = filteredAdapters

      const highlight = filteredAdapters.previouslyConnected.slice(0, 3)
      let others = Object.values(rest)
        .flat()
        .sort((a, b) => PRIORITISE[a.readyState] - PRIORITISE[b.readyState])
        .sort(sortByPrecedence(walletPrecedence || []))
      others.unshift(
        ...filteredAdapters.previouslyConnected.slice(
          3,
          filteredAdapters.previouslyConnected.length,
        ),
      )
      others = others.filter(Boolean)

      return {
        highlightedBy: "PreviouslyConnected",
        highlight,
        others,
      }
    }

    if (filteredAdapters.installed.length > 0) {
      const { installed, top3, ...rest } = filteredAdapters
      const highlight = [...installed.slice(0, 3), ...top3.filter(Boolean)].filter(Boolean)

      const others = Object.values(rest)
        .flat()
        .sort((a, b) => PRIORITISE[a.readyState] - PRIORITISE[b.readyState])
        .sort(sortByPrecedence(walletPrecedence || []))
      others.unshift(...filteredAdapters.installed.slice(3, filteredAdapters.installed.length))

      return { highlightedBy: "TopAndRecommended", highlight, others }
    }

    if (filteredAdapters.loadable.length === 0) {
      return { highlightedBy: "Onboarding", highlight: [], others: [] }
    }

    const { top3, ...rest } = filteredAdapters
    const others = Object.values(rest)
      .flat()
      .sort((a, b) => PRIORITISE[a.readyState] - PRIORITISE[b.readyState])
      .sort(sortByPrecedence(walletPrecedence || []))
    return { highlightedBy: "TopWallet", highlight: top3, others }
  })

  // <Show when={walletModalAttachments?.footer}>{walletModalAttachments?.footer}</Show>

  return (
    <Dialog open={showModal()} onOpenChange={setShowModal}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />

        <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
          <Dialog.Content
            class="max-w-md w-full relative flex flex-col overflow-hidden rounded-xl max-h-[90vh] lg:max-h-[576px] transition-height duration-500 ease-in-out text-white bg-jupiter-bg"
            // class="z-50 w-[95vw] max-w-xs rounded-lg border border-white/10 duration-200 corvu-open:animate-in corvu-open:fade-in-0 corvu-open:zoom-in-95 corvu-open:slide-in-from-left-1/2 corvu-open:slide-in-from-top-[60%] corvu-closed:animate-out corvu-closed:fade-out-0 corvu-closed:zoom-out-95 corvu-closed:slide-out-to-left-1/2 corvu-closed:slide-out-to-top-[60%] bg-gray-800 text-slate-100"
          >
            <div class="px-5 py-6 flex justify-between leading-none border-b border-b-white/10">
              <div>
                <div>
                  <Dialog.Label as="span" class="text-sm font-semibold h-min">
                    {t(`Connect Wallet`)}
                  </Dialog.Label>
                </div>
                <div>
                  <Dialog.Description as="span" class="text-xs text-white/50 h-min">
                    {t(`You need to connect a Solana wallet.`)}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close class="absolute top-4 right-4 bg-jupiter-bg">
                <CloseIcon width={12} height={12} />
              </Dialog.Close>
            </div>
            <ListOfWallets list={list()} onToggle={() => setIsOpen(p => !p)} isOpen={isOpen()} />
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}
