// @refresh reload
import { loadCustomElements } from "@solana-wallets-solid/unified"
import { mount, StartClient } from "@solidjs/start/client"

loadCustomElements()
mount(() => <StartClient />, document.getElementById("app")!)