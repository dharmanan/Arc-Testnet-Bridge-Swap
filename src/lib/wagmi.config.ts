import { createConfig, http } from 'wagmi'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { ARC_EVM_CHAIN, SEPOLIA_EVM_CHAIN, SUPPORTED_EVM_CHAINS } from './chains'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim()

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: 'Arc Bridge' }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
        }),
      ]
    : []),
]

export const wagmiConfig = createConfig({
  chains: SUPPORTED_EVM_CHAINS,
  connectors,
  transports: {
    [SEPOLIA_EVM_CHAIN.id]: http(import.meta.env.VITE_SEPOLIA_RPC?.trim() || SEPOLIA_EVM_CHAIN.rpcUrls.default.http[0]),
    [ARC_EVM_CHAIN.id]: http(import.meta.env.VITE_ARC_TESTNET_RPC?.trim() || ARC_EVM_CHAIN.rpcUrls.default.http[0]),
  },
  ssr: false,
})