import { ARC_EVM_CHAIN, ARC_EVM_CHAIN_ID, SEPOLIA_EVM_CHAIN, SEPOLIA_EVM_CHAIN_ID } from '../lib/chains'

// Network Configuration
export const NETWORK_CONFIG = {
  SEPOLIA: {
    id: SEPOLIA_EVM_CHAIN_ID,
    name: SEPOLIA_EVM_CHAIN.name,
    rpc: SEPOLIA_EVM_CHAIN.rpcUrls.default.http[0],
    explorer: SEPOLIA_EVM_CHAIN.blockExplorers?.default?.url || 'https://sepolia.etherscan.io',
  },
  ARC_TESTNET: {
    id: ARC_EVM_CHAIN_ID,
    name: ARC_EVM_CHAIN.name,
    rpc: ARC_EVM_CHAIN.rpcUrls.default.http[0],
    explorer: ARC_EVM_CHAIN.blockExplorers?.default?.url || 'https://testnet.arcscan.io',
  },
}

// Uniswap V2 Configuration
export const UNISWAP_CONFIG = {
  ROUTER_ADDRESS: '0x68b3465833fb72B5A828cCEEAa5BE01d33e3B3d8',
  FACTORY_ADDRESS: '0x1F98431c8aD98523631AE4a59f267346ea3113F',
  QUOTER_ADDRESS: '0xb27308f9F90D7c6f7ABC9C23B1b8b6e0e69b1b71', // V3 Quoter (if needed)
}

// Token Configuration
export const TOKEN_CONFIG = {
  WETH: {
    address: '0xfFf9976782d46CC05630D06953f7751f7DA666DC',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
}

// Bridge Configuration
export const BRIDGE_CONFIG = {
  FROM_CHAIN: {
    id: SEPOLIA_EVM_CHAIN_ID,
    name: SEPOLIA_EVM_CHAIN.name,
  },
  TO_CHAIN: {
    id: ARC_EVM_CHAIN_ID,
    name: ARC_EVM_CHAIN.name,
  },
  // Circle Bridge Kit configuration would go here
  CIRCLE_APP_ID: import.meta.env.VITE_CIRCLE_APP_ID || '',
}

// Swap Configuration
export const SWAP_CONFIG = {
  DEFAULT_SLIPPAGE: 0.5,
  MIN_SLIPPAGE: 0.1,
  MAX_SLIPPAGE: 5,
  ROUTE_TIMEOUT: 30000, // 30 seconds
  PRICE_REFRESH_INTERVAL: 5000, // 5 seconds
}

// Gas Configuration
export const GAS_CONFIG = {
  SWAP_GAS_ESTIMATE: 250000n,
  APPROVE_GAS_ESTIMATE: 100000n,
  BRIDGE_GAS_ESTIMATE: 300000n,
}
