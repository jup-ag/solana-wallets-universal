import { batch, Component, createEffect, createSignal, Match, on, Show, Switch } from "solid-js"

import { useUnifiedWallet } from "../../contexts"
import ExternalIcon from "../../icons/ExternalIcon"

export type OnboardingFlow = "Onboarding" | "Get Wallet"

type OnboardingIntroProps = {
  flow: OnboardingFlow
  setFlow: (flow: OnboardingFlow) => void
  onClose: () => void
  showBack: boolean
}
export const OnboardingIntro: Component<OnboardingIntroProps> = props => {
  const { t } = useUnifiedWallet()

  return (
    <div class="flex flex-col justify-center items-center p-10">
      <img src={"https://unified.jup.ag/new_user_onboarding.png"} width={160} height={160} />

      <div class="mt-4 flex flex-col justify-center items-center text-center">
        <span class="text-lg font-semibold">{t(`New here?`)}</span>
        <span
          class="mt-3 text-sm text-white/50"
          // classList={{
          //   "text-black/70": theme === "light",
          //   "text-white/50": theme !== "light",
          // }}
        >
          {t(`Welcome to DeFi! Create a crypto wallet to get started!`)}
        </span>
      </div>

      <div class="mt-6 w-full">
        <button
          type="button"
          class="font-semibold text-base w-full rounded-lg border border-white/10 py-5 leading-none bg-black hover:bg-black/50"
          // classList={{
          //   "bg-[#31333B] text-white hover:bg-black": theme === "light",
          //   "bg-[#31333B] hover:bg-black/30": theme === "dark",
          //   "bg-black hover:bg-black/50": theme === "jupiter",
          // }}
          onClick={() => props.setFlow("Get Wallet")}
        >
          {t(`Get Started`)}
        </button>
      </div>
      <Show when={props.showBack}>
        <button
          type="button"
          class="mt-3 text-xs text-white/50 font-semibold"
          // classList={{}}
          // css={[tw`mt-3 text-xs text-white/50 font-semibold`, styles.subtitle[theme]]}
          onClick={() => props.onClose()}
        >
          {"← " + t(`Go back`)}
        </button>
      </Show>
    </div>
  )
}

type OnboardingGetWalletsProps = {
  flow: OnboardingFlow
  setFlow: (flow: OnboardingFlow) => void
}
export const OnboardingGetWallets: Component<OnboardingGetWalletsProps> = props => {
  const { t } = useUnifiedWallet()

  return (
    <div class="flex flex-col justify-center py-3 px-10">
      <span class="text-base font-semibold">{t(`Popular wallets to get started`)}</span>
      <div class="mt-4 w-full space-y-2">
        {/*

        <For each={HARDCODED_WALLET_STANDARDS}>
          {item => (
            <a
              href={item.url}
              target="_blank"
              class="px-5 py-4 flex space-x-4 w-full rounded-lg text-sm font-semibold items-center bg-white/5 hover:bg-white/20 border border-white/10 shadow-lg"
              // classList={{
              //   "bg-[#F9FAFB] hover:bg-black/5": theme === "light",
              //   "bg-white/10 hover:bg-white/20 border border-white/10 shadow-lg": theme === "dark",
              //   "bg-white/5 hover:bg-white/20 border border-white/10 shadow-lg":
              //     theme === "jupiter",
              // }}
            >
              <img src={item.icon} width={20} height={20} alt={item.name} />
              <span>{item.name}</span>
            </a>
          )}
        </For>

				*/}

        <a
          href={"https://station.jup.ag/partners?category=Wallets"}
          target="_blank"
          class="px-5 py-4 flex space-x-4 w-full rounded-lg text-sm font-semibold items-center bg-white/5 hover:bg-white/20 border border-white/10 shadow-lg"
          // classList={{
          //   "bg-[#F9FAFB] hover:bg-black/5": theme === "light",
          //   "bg-white/10 hover:bg-white/20 border border-white/10 shadow-lg": theme === "dark",
          //   "bg-white/5 hover:bg-white/20 border border-white/10 shadow-lg": theme === "jupiter",
          // }}
        >
          <div
            class="fill-current w-5 h-5 flex items-center p-0.5 text-white/30"
            // classList={{
            //   "text-black/30": theme === "light",
            //   "text-white/30": theme !== "light",
            // }}
          >
            <ExternalIcon width={16} height={16} />
          </div>
          <span>{t(`More wallets`)}</span>
        </a>
      </div>

      <span
        class="mt-3 text-center text-xs text-white/50"
        // classList={{
        //   "text-black/70": theme === "light",
        //   "text-white/50": theme !== "light",
        // }}
      >
        {t(`Once installed, refresh this page`)}
      </span>
      <button
        type="button"
        class="mt-3 text-xs font-semibold text-white/50"
        // classList={{
        //   "text-black/70": theme === "light",
        //   "text-white/50": theme !== "light",
        // }}
        onClick={() => props.setFlow("Onboarding")}
      >
        {"← " + t(`Go back`)}
      </button>
    </div>
  )
}

type OnboardingFlowProps = {
  onClose: () => void
  showBack: boolean
}
export const OnboardingFlow: Component<OnboardingFlowProps> = props => {
  const [flow, setFlow] = createSignal<OnboardingFlow>("Onboarding")
  const [animateOut, setAnimateOut] = createSignal(false)

  let contentRef: HTMLDivElement | undefined
  const setFlowAnimated = (flow: OnboardingFlow) => {
    setAnimateOut(true)

    setTimeout(() => {
      contentRef?.scrollTo(0, 0)
      batch(() => {
        setAnimateOut(false)
        setFlow(flow)
      })
    }, 200)
  }

  createEffect(
    on(animateOut, animateOut => {
      const classes = ["animate-fade-out", "opacity-0"]
      if (animateOut) {
        contentRef?.classList.add(...classes)
      } else {
        contentRef?.classList.remove(...classes)
      }
    }),
  )
  createEffect(() => {
    console.log({ flow: flow() })
  })

  return (
    <div
      ref={contentRef}
      class="duration-500 animate-fade-in overflow-y-scroll hideScrollbar"
      // classList={{
      //   "animate-fade-out opacity-0": animateOut(),
      // }}
    >
      <Switch>
        <Match when={flow() === "Onboarding"}>
          <OnboardingIntro
            showBack={props.showBack}
            flow={flow()}
            setFlow={setFlowAnimated}
            onClose={props.onClose}
          />
        </Match>
        <Match when={flow() === "Get Wallet"}>
          <OnboardingGetWallets flow={flow()} setFlow={setFlowAnimated} />
        </Match>
      </Switch>
    </div>
  )
}
