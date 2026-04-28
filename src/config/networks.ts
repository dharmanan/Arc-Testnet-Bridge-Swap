import { ARC_EVM_CHAIN, SEPOLIA_EVM_CHAIN } from '../lib/chains'

export const SEPOLIA_TESTNET = {
  ...SEPOLIA_EVM_CHAIN,
  network: 'sepolia',
}

export const ARC_TESTNET = {
  ...ARC_EVM_CHAIN,
  network: 'arc-testnet',
}

// SushiSwap Sepolia addresses (working Sepolia DEX)
export const SUSHISWAP_SEPOLIA = {
  ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap Router
  FACTORY: '0xFBC12984063f1e1339AC3bd02d1adBAc89fED8ab',
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  USDC: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI on Sepolia (Ethereum mainnet DAI)
}

// Token decimals
export const TOKEN_DECIMALS = {
  ETH: 18,
  USDC: 6,
}

// Circle Bridge Kit config
export const CIRCLE_CONFIG = {
  appId: import.meta.env.VITE_CIRCLE_APP_ID || '',
}
