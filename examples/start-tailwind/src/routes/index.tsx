import { createEffect, For, Show } from "solid-js"
import { UnifiedWalletButton, useUnifiedWallet } from "@solana-wallets-solid/unified"
import { Hello } from "@solana-wallets-solid/hello"
import { A } from "@solidjs/router"

import Counter from "~/components/Counter"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")

export default function Home() {
  const {
    select,
    wallets,
    name,
    adapter,
    publicKey,
    disconnect,
    signMessage,
    env,
    theme,
    metadata,
    locale,
  } = useUnifiedWallet()

  createEffect(() => {
    console.log({ env, theme, metadata, locale: locale() })
  })

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
      <div class="flex items-center justify-center w-full">
        <UnifiedWalletButton />
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
