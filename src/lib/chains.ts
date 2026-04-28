import type { Chain } from 'viem'
import { arcTestnet, sepolia } from 'viem/chains'

type WalletRequest = (args: { method: string; params?: unknown[] }) => Promise<unknown>

export const SEPOLIA_EVM_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC?.trim() || 'https://ethereum-sepolia-rpc.publicnode.com'
export const ARC_EVM_RPC_URL = import.meta.env.VITE_ARC_TESTNET_RPC?.trim() || 'https://rpc.testnet.arc.network'

export const SEPOLIA_EVM_CHAIN: Chain = {
  ...sepolia,
  rpcUrls: {
    default: { http: [SEPOLIA_EVM_RPC_URL] },
    public: { http: [SEPOLIA_EVM_RPC_URL] },
  },
}

export const ARC_EVM_CHAIN: Chain = {
  ...arcTestnet,
  rpcUrls: {
    default: { http: [ARC_EVM_RPC_URL] },
    public: { http: [ARC_EVM_RPC_URL] },
  },
}

export const SEPOLIA_EVM_CHAIN_ID = SEPOLIA_EVM_CHAIN.id
export const ARC_EVM_CHAIN_ID = ARC_EVM_CHAIN.id

export const SUPPORTED_EVM_CHAINS = [SEPOLIA_EVM_CHAIN, ARC_EVM_CHAIN] as const
export const SUPPORTED_EVM_CHAIN_OPTIONS = SUPPORTED_EVM_CHAINS.map((chain) => ({
  id: chain.id,
  name: chain.name,
}))

const supportedEvmChainsById = new Map<number, Chain>(
  SUPPORTED_EVM_CHAINS.map((chain) => [chain.id, chain])
)

export function getSupportedEvmChain(chainId?: number) {
  if (!chainId) return undefined
  return supportedEvmChainsById.get(chainId)
}

export function getSupportedEvmChainName(chainId?: number) {
  return getSupportedEvmChain(chainId)?.name ?? 'Unknown Network'
}

export async function addChainToWallet(chain: Chain, request?: WalletRequest | null) {
  if (!request) return false

  await request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${chain.id.toString(16)}`,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls.default.http,
        blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : [],
      },
    ],
  })

  return true
}