import {
  batch,
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
  VoidComponent,
} from "solid-js"
import Dialog from "@corvu/dialog"
import {
  WalletAdapterCompatibleStandardWallet,
  WalletName,
  WalletReadyState,
} from "@solana/wallet-adapter-base"
// import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile"
import {
  dispatchConnect,
  isMobile,
  SolanaMobileWalletAdapterWalletName,
  WalletInfo,
} from "@solana-wallets/core-2.0"
import { Dynamic } from "solid-js/web"

import { UnifiedWalletModalProps, useUnifiedWallet } from "../../contexts"
import CloseIcon from "../../icons/CloseIcon"
import { OnboardingFlow } from "./Onboarding"
import { WalletIcon, WalletListItem } from "./WalletListItem"
import ChevronUpIcon from "../../icons/ChevronUpIcon"
import ChevronDownIcon from "../../icons/ChevronDownIcon"
import { Collapse } from "../Collapse"
import { NotInstalled } from "./NotInstalled"

export const Header: VoidComponent = () => {
  const { setIsModalOpen, t } = useUnifiedWallet()

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

      <button class="absolute top-4 right-4" onClick={() => setIsModalOpen(false)}>
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  )
}

type ListOfWalletsProps = {
  list: {
    highlightedBy: HIGHLIGHTED_BY
    highlight: WalletInfo[]
    others: WalletInfo[]
  }
  onToggle: (nextValue?: any) => void
  isOpen: boolean
}
export const ListOfWallets: Component<ListOfWalletsProps> = props => {
  const { t, walletlistExplanation, walletAttachments } = useUnifiedWallet()
  const [showOnboarding, setShowOnboarding] = createSignal(false)
  const [showNotInstalled, setShowNotInstalled] = createSignal<
    WalletAdapterCompatibleStandardWallet | false
  >(false)

  const list = createMemo(() => props.list)
  const hasNoWallets = createMemo(() => {
    return list().highlight.length + list().others.length === 0
  })

  async function onWalletClick(wallet: string) {
    console.log("onWalletClick: ", { wallet })
    dispatchConnect({ wallet })
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
      console.log("no wallets, showing onboarding...")
      setShowOnboarding(true)
    }
  })

  createEffect(() => {
    console.log("wallets in list: ", { list: list() })
  })

  return (
    <>
      <Switch>
        <Match when={showOnboarding()}>
          <OnboardingFlow showBack={!hasNoWallets} onClose={() => setShowOnboarding(false)} />
        </Match>

        <Match when={showNotInstalled()}>
          {notInstalled => (
            <NotInstalled
              wallet={notInstalled()}
              onClose={() => setShowNotInstalled(false)}
              onGoOnboarding={() => {
                batch(() => {
                  setShowOnboarding(true)
                  setShowNotInstalled(false)
                })
              }}
            />
          )}
        </Match>

        {/*
<Match when={!showOnboarding() && !showNotInstalled()}>
				*/}
        <Match when={!showOnboarding()}>
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
                {info => {
                  const walletName = createMemo<string>(() => {
                    if (info.wallet.name === SolanaMobileWalletAdapterWalletName) {
                      return t(`Mobile`) as string
                    }
                    return info.wallet.name
                  })
                  const attachment = walletAttachments
                    ? walletAttachments[walletName()]?.attachment
                    : null
                  return (
                    <Dynamic
                      component={info.type !== "ios-webview" ? "button" : "a"}
                      type="button"
                      class="py-4 px-4 border border-white/10 rounded-lg flex items-center cursor-pointer flex-1 hover:backdrop-blur-xl transition-all hover:shadow-2xl hover:bg-white/10 bg-jupiter-bg"
                      onClick={
                        info.type !== "ios-webview"
                          ? () => onWalletClick(info.wallet.name)
                          : undefined
                      }
                      href={
                        info.type === "ios-webview"
                          ? info.wallet.deepUrl?.(window.location)
                          : undefined
                      }
                    >
                      <WalletIcon
                        name={info.wallet.name}
                        icon={info.wallet.icon}
                        width={isMobile() ? 24 : 30}
                        height={isMobile() ? 24 : 30}
                      />
                      <span class="font-semibold text-xs ml-4 text-white">{walletName()}</span>
                      <Show when={attachment}>{_attachment => <div>{_attachment()}</div>}</Show>
                    </Dynamic>
                  )
                }}
              </For>
            </div>

            <Switch>
              <Match when={walletlistExplanation && list().others.length === 0}>
                <div class="text-xs font-semibold mt-4 -mb-2 text-white/80 underline cursor-pointer">
                  <a href={walletlistExplanation?.href} target="_blank" rel="noopener noreferrer">
                    <span>{t(`Can't find your wallet?`)}</span>
                  </a>
                </div>
              </Match>

              <Match when={list().others.length > 0}>
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
                          {info => (
                            <ul>
                              <WalletListItem
                                handleClick={() =>
                                  info.type !== "ios-webview"
                                    ? onWalletClick(info.wallet.name)
                                    : undefined
                                }
                                info={info}
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
              </Match>
            </Switch>

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
        </Match>
      </Switch>
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

export const sortByPrecedence =
  (walletPrecedence: WalletName[]) => (a: WalletInfo, b: WalletInfo) => {
    if (!walletPrecedence) return 0

    const aIndex = walletPrecedence.indexOf(a.wallet.name as WalletName)
    const bIndex = walletPrecedence.indexOf(b.wallet.name as WalletName)

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

type FilteredAdapters = {
  previouslyConnected: WalletInfo[]
  installed: WalletInfo[]
  top3: WalletInfo[]
  loadable: WalletInfo[]
  notDetected: WalletInfo[]
}

type WalletList = {
  highlightedBy: HIGHLIGHTED_BY
  highlight: WalletInfo[]
  others: WalletInfo[]
}

const UnifiedWalletModal: Component<UnifiedWalletModalProps> = props => {
  const { getPreviouslyConnected, walletPrecedence, isModalOpen, setIsModalOpen, wallets } =
    useUnifiedWallet()
  const [isExpanded, setIsExpanded] = createSignal(props.isExpanded ?? true)

  const filteredAdapters = createMemo(() => {
    const _wallets = wallets()
    if (!_wallets) {
      return {
        previouslyConnected: [],
        installed: [],
        top3: [],
        loadable: [],
        notDetected: [],
      }
    }
    return _wallets.reduce<FilteredAdapters>(
      (acc, walletInfo) => {
        const wallet = walletInfo.wallet
        const walletName = wallet.name
        // Previously connected takes highest
        const previouslyConnectedIndex = getPreviouslyConnected().indexOf(walletName)
        if (previouslyConnectedIndex >= 0) {
          acc.previouslyConnected.push(walletInfo)
          return acc
        }
        // Top 3
        const topWalletsIndex = TOP_WALLETS.indexOf(walletName as WalletName)
        if (topWalletsIndex >= 0) {
          acc.top3.push(walletInfo)
          return acc
        }

        acc.loadable.push(walletInfo)
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
  })

  createEffect(() => {
    console.log("filteredAdapters: ", filteredAdapters())
  })

  const list = createMemo<WalletList>(() => {
    // Then, Installed, Top 3, Loadable, NotDetected
    const filtered = filteredAdapters()

    console.log("list createMemo: filtered adapters: ", { filtered })

    if (filtered.previouslyConnected.length > 0) {
      const { previouslyConnected, ...rest } = filtered

      // const previouslyConnectedInfos: WalletInfo[] = previouslyConnected.wallets.map(a =>
      //   isWalletAdapterCompatibleStandardWallet(a)
      //     ? createStandardWalletInfo(a)
      //     : {
      //         type: "mobile-deeplink",
      //         icon: a.icon,
      //         name: a.name,
      //         deeplink: a.deepUrl?.(window.location) ?? "",
      //       },
      // )

      const highlight = previouslyConnected.slice(0, 3)

      let others = Object.values(rest)
        .flat()
        .sort(sortByPrecedence(walletPrecedence || []))
      others.unshift(...previouslyConnected.slice(3, previouslyConnected.length))
      others = others.filter(Boolean)

      // if (isIosAndRedirectable()) {
      //   const redirectableWalletInfos: WalletInfo[] = HARDCODED_WALLET_STANDARDS.filter(
      //     w => !!w.deepUrl,
      //   ).map(w => ({
      //     type: "mobile-deeplink",
      //     name: w.name,
      //     icon: w.icon,
      //     deeplink: w.deepUrl!(location),
      //   }))
      //   others.push(...redirectableWalletInfos)
      // }

      return {
        highlightedBy: "PreviouslyConnected",
        highlight,
        others,
      }
    }

    if (filtered.installed.length > 0) {
      const { installed, top3, ...rest } = filtered

      // if (isIosAndRedirectable()) {
      //   const redirectableWalletInfos: WalletInfo[] = HARDCODED_WALLET_STANDARDS.filter(
      //     w => !!w.deepUrl,
      //   ).map(w => ({
      //     type: "mobile-deeplink",
      //     name: w.name,
      //     icon: w.icon,
      //     deeplink: w.deepUrl!(location),
      //   }))
      //   topWalletInfos.push(...redirectableWalletInfos)
      // }

      const highlight: WalletInfo[] = [...installed.slice(0, 3), ...top3.filter(Boolean)].filter(
        Boolean,
      )

      const others: WalletInfo[] = Object.values(rest)
        .flat()
        .sort(sortByPrecedence(walletPrecedence || []))
      others.unshift(...installed.slice(3, installed.length))

      return { highlightedBy: "TopAndRecommended", highlight, others }
    }

    if (
      filtered.loadable.length === 0 &&
      filtered.top3.length === 0 &&
      filtered.installed.length === 0
    ) {
      return { highlightedBy: "Onboarding", highlight: [], others: [] }
    }

    const { top3, ...rest } = filtered
    // if (isIosAndRedirectable()) {
    // const redirectableWalletInfos: WalletInfo[] = HARDCODED_WALLET_STANDARDS.filter(
    //   w => !!w.deepUrl,
    // ).map(w => ({
    //   type: "mobile-deeplink",
    //   name: w.name,
    //   icon: w.icon,
    //   deeplink: w.deepUrl!(location),
    // }))
    // topWalletInfos.push(...redirectableWalletInfos)
    // }

    const others: WalletInfo[] = Object.values(rest)
      .flat()
      .sort(sortByPrecedence(walletPrecedence || []))

    return { highlightedBy: "TopWallet", highlight: top3, others }
  })

  // <Show when={walletModalAttachments?.footer}>{walletModalAttachments?.footer}</Show>

  return (
    <Dialog open={isModalOpen()} onOpenChange={o => setIsModalOpen(o)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />

        <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
          <Dialog.Content class="max-w-md w-full relative flex flex-col overflow-hidden rounded-xl max-h-[90vh] lg:max-h-[576px] transition-height duration-500 ease-in-out text-white bg-jupiter-bg">
            <div class="px-5 py-6 flex justify-between leading-none border-b border-b-white/10">
              <div>
                <div>
                  <Dialog.Label as="span" class="text-sm font-semibold h-min">
                    {/*
                    {t(`Connect Wallet`)}
										*/}
                    {`Connect Wallet`}
                  </Dialog.Label>
                </div>
                <div>
                  <Dialog.Description as="span" class="text-xs text-white/50 h-min">
                    {/*
                    {t(`You need to connect a Solana wallet.`)}
									*/}
                    {`You need to connect a Solana wallet.`}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close class="absolute top-4 right-4 bg-jupiter-bg">
                <CloseIcon width={12} height={12} />
              </Dialog.Close>
            </div>
            <ListOfWallets
              list={list()}
              onToggle={() => setIsExpanded(p => !p)}
              isOpen={isExpanded()}
            />
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default UnifiedWalletModal
