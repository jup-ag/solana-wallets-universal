import { Fragment } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import useDebugRender from "tilg";
import {
	UnifiedWalletButtonProps,
	UnifiedWalletProviderProps,
} from "@solana-wallets-solid/unified";
import { WalletProvider } from "@solana-wallets-solid/react";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			"unified-wallet-modal": React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			> &
				UnifiedWalletProviderProps;
		}
		interface IntrinsicElements {
			"unified-wallet-modal-button": React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			> &
				UnifiedWalletButtonProps;
		}
	}
}

export default function App() {
	useDebugRender();

	return (
		<Fragment>
			<WalletProvider
				autoConnect={true}
				disconnectOnAccountChange={true}
				localStorageKey="unified:wallet-stoarge-key"
			>
				<Fragment>
					<unified-wallet-modal
						autoConnect={true}
						disconnectOnAccountChange={false}
						config={{
							env: "mainnet-beta",
							theme: "jupiter",
							metadata: {
								name: "UnifiedWallet",
								description: "UnifiedWallet",
								url: "https://jup.ag",
								iconUrls: ["https://jup.ag/favicon.ico"],
							},
							walletlistExplanation: {
								href: "https://station.jup.ag/docs/additional-topics/wallet-list",
							},
						}}
					/>
					<Outlet />
					<ScrollRestoration />
				</Fragment>
			</WalletProvider>
		</Fragment>
	);
}
