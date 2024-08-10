import { createEffect, For, onCleanup, onMount, Show } from "solid-js"
import { useWallet } from "@solana-wallets-solid/core"
import { getWallets, DEPRECATED_getWallets } from "@wallet-standard/app"

import Counter from "~/components/Counter"
import { Hello } from "@solana-wallets-solid/hello"
import { A } from "@solidjs/router"
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base"
import { isWalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")

export default function Home() {
  const {
    autoConnect,
    connect,
    initialize,
    select,
    wallets,
    name,
    adapter,
    publicKey,
    disconnect,
    signMessage,
  } = useWallet()

  function updateWallets() {
    // get installed wallets compatible with the standard
    const { get } = DEPRECATED_getWallets()
    const _wallets = get()
      .filter(w => w.accounts.length > 0)
      .map(w => ({
        ...w,
        accounts: w.accounts.map(w => ({ ...w, publicKey: new Uint8Array(w.publicKey) })),
      }))
    const standardWallets = _wallets
      // select wallets compatible with the Wallet Standard
      .filter(w => isWalletAdapterCompatibleStandardWallet(w))
      // select wallets not already configured by the dapp
      // .filter(wallet => !wallets.some(({ adapter }) => adapter.name === name))
      // wrap as a Standard Adapter class
      .map(wallet => new StandardWalletAdapter({ wallet }))

    const allWallets = [...standardWallets, ...wallets.map(w => w.adapter)]
    console.log({ allWallets })

    // merge standard mobile wallet if available
    // const mobileWallet = getMobileWallet(allWallets)
    // if (mobileWallet) allWallets.unshift(mobileWallet)

    // sort 'Installed' wallets first and 'Loadable' next
    // const installedFirst = (a: Adapter, b: Adapter) =>
    //   detectedFirst(WalletReadyState.Installed, a, b)
    // const loadableFirst = (a: Adapter, b: Adapter) => detectedFirst(WalletReadyState.Loadable, a, b)
    // allWallets.sort(loadableFirst).sort(installedFirst)

    // initialize wallets store
    initialize({ wallets: allWallets, autoConnect, localStorageKey: "hielasd" })
  }

  // function detectedFirst(state: WalletReadyState, a: Adapter, b: Adapter) {
  //   let sort: number = 0
  //   const isDetected = (c: Adapter) => c.readyState === state
  //
  //   if (isDetected(a) && !isDetected(b)) sort = -1
  //   if (!isDetected(a) && isDetected(b)) sort = 1
  //   return sort
  // }

  // function getMobileWallet(wallets: Adapter[]) {
  //   /**
  //    * Return null if Mobile wallet adapter is already in the list or if ReadyState is Installed.
  //    *
  //    * There are only two ways a browser extension adapter should be able to reach `Installed` status:
  //    *   1. Its browser extension is installed.
  //    *   2. The app is running on a mobile wallet's in-app browser.
  //    * In either case, we consider the environment to be desktop-like and not 'mobile'.
  //    */
  //   if (
  //     wallets.some(
  //       ({ name, readyState }) =>
  //         name === SolanaMobileWalletAdapterWalletName || readyState === WalletReadyState.Installed,
  //     )
  //   ) {
  //     return null
  //   }
  //
  //   const ua = globalThis.navigator?.userAgent ?? null
  //
  //   const isOnAndroid = (ua: string) => /android/i.test(ua)
  //
  //   const isInWebView = (ua: string) =>
  //     /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i.test(
  //       ua,
  //     )
  //
  //   const getUriForAppIdentity = () => {
  //     const { location } = globalThis
  //     if (location) return `${location.protocol}//${location.host}`
  //   }

  // /**
  //  * Return Mobile Wallet Adapter object if we are running
  //  * on a device that supports MWA like Android
  //  * and we are *not* running in a WebView.
  //  */
  // if (ua && isOnAndroid(ua) && !isInWebView(ua)) {
  //   return new SolanaMobileWalletAdapter({
  //     addressSelector: createDefaultAddressSelector(),
  //     appIdentity: {
  //       uri: getUriForAppIdentity(),
  //     },
  //     authorizationResultCache: createDefaultAuthorizationResultCache(),
  //     chain: getChainForEndpoint($workSpace?.connection?.rpcEndpoint || ""),
  //     onWalletNotFound: createDefaultWalletNotFoundHandler(),
  //   })
  // }
  //

  async function signArbitary() {
    try {
      const signMsg = signMessage()
      if (!signMsg) {
        console.error("connected wallet is unable to sign arbitrary message!")
        return
      }
      const res = await signMsg(SIGN_ARBITRARY_MSG)
      console.log(res)
      alert("Sign success! Check console logs for details.")
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
    }
  }

  onMount(() => {
    updateWallets()
    const { on } = getWallets()
    const removeRegisterListener = on("register", updateWallets)
    const removeUnregisterListener = on("unregister", updateWallets)
    onCleanup(() => {
      removeRegisterListener()
      removeUnregisterListener()
    })
  })
  createEffect(() => {
    console.log("connected wallet: ", { adapter: adapter() })
  })

  createEffect(() => {
    console.log("connected pub key: ", { pubkey: publicKey() })
  })
  return (
    <main class="text-center mx-auto text-gray-700 p-4 space-y-8">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">Hello world!</h1>

      <Hello />
      <div class="flex flex-col gap-y-3 items-center justify-center">
        <For each={Object.values(wallets)}>
          {w => (
            <button
              class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit"
              onClick={async () => {
                const _adapter = adapter()
                if (!_adapter) {
                  await select(w.adapter.name)
                  await connect()
                } else if (_adapter.name === w.adapter.name) {
                  await disconnect()
                }
              }}
            >
              <Show
                when={!adapter() || name() !== w.adapter.name}
                fallback={`disconnect from ${w.adapter.name}`}
              >
                connect to {w.adapter.name}
              </Show>
            </button>
          )}
        </For>
      </div>
      <div class="flex flex-col gap-y-3 items-center justify-center">
        <Show when={publicKey() != null} fallback={""}>
          <code>{publicKey()!.toString()}</code>
        </Show>
        <Show when={publicKey()}>
          <button class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit" onClick={signArbitary}>
            Sign message!
          </button>
        </Show>
      </div>

      <Counter />
      <p class="mt-8">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" class="text-sky-600 hover:underline">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="my-4">
        <span>Home</span>
        {" - "}
        <A href="/about" class="text-sky-600 hover:underline">
          About Page
        </A>{" "}
      </p>
    </main>
  )
}
