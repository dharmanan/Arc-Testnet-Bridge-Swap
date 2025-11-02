# Arc Sepolia DEX Bridge

A full-stack decentralized exchange and cross-chain bridge application for Sepolia testnet and Arc testnet. Built with React, TypeScript, Uniswap V2, and Circle Bridge Kit.

## ✨ Features

### 🔄 Swap Tab
- **ETH ↔ USDC Swapping** on Sepolia testnet using Uniswap V2
- Real-time price estimation and updates
- Adjustable slippage tolerance (0.1% - 5%)
- Gas estimation and transaction tracking
- Full wallet integration with MetaMask

### 🌉 Bridge Tab
- **Bridge USDC** from Sepolia to Arc Testnet
- Circle Bridge Kit integration ready
- Real-time balance display
- Transaction status tracking and confirmation

### 📊 Dashboard Tab
- **Wallet Information** - Connected address and network display
- **Token Balances** - Real-time ETH and USDC holdings
- **Transaction History** - Recent swaps and bridges
- **Account Statistics** - Transaction count and total volume

## � Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask wallet
- Sepolia testnet ETH

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Arc-Testnet-Bridge-Swap

# Install dependencies
npm install --legacy-peer-deps

# Setup environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📋 Network Configuration

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC**: https://rpc.sepolia.org
- **Explorer**: https://sepolia.etherscan.io

### Arc Testnet
- **Chain ID**: 42124
- **RPC**: https://rpc.testnet.arccoin.io
- **Explorer**: https://testnet.arcscan.io

## � Smart Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| Uniswap V2 Router | `0x68b3465833fb72B5A828cCEEAa5BE01d33e3B3d8` |
| Uniswap Factory | `0x1F98431c8aD98523631AE4a59f267346ea3113F` |
| WETH | `0xfFf9976782d46CC05630D06953f7751f7DA666DC` |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State Management | React Hooks |
| Web3 Library | ethers.js v6 |
| Wallet Connection | wagmi, RainbowKit |
| DEX Integration | Uniswap V2 SDK |
| Bridge | Circle Bridge Kit (ready for integration) |

## 📚 Project Structure

```
src/
├── components/          # React components
│   ├── SwapTab.tsx      # Swap interface
│   ├── BridgeTab.tsx    # Bridge interface
│   ├── DashboardTab.tsx # Dashboard
│   └── ui/              # Reusable UI components
├── hooks/               # Custom React hooks
│   ├── useSwapContract.ts    # Swap contract interactions
│   ├── useBridgeContract.ts  # Bridge contract interactions
│   ├── useSwapAndBridge.ts   # Utility hooks
│   └── useToken.ts           # Token operations
├── config/              # Configuration files
│   ├── index.ts         # App configuration
│   └── networks.ts      # Network definitions
├── utils/               # Utility functions
│   └── index.ts         # Helper functions
├── test/                # Test utilities
│   └── utils.ts         # Mock data and test helpers
├── App.tsx              # Main app component
└── main.tsx             # Entry point
```

## 🔄 How It Works

### Swapping
1. User selects swap direction (ETH → USDC or USDC → ETH)
2. App fetches real-time pricing from Uniswap V2
3. User confirms swap with slippage tolerance
4. Transaction is signed by wallet and executed
5. Confirmation displayed with transaction hash

### Bridging
1. User selects USDC amount to bridge
2. System checks balance and allowance
3. User approves USDC transfer (if needed)
4. Bridge transaction initiated to Circle Bridge Kit
5. Cross-chain confirmation tracked

### Dashboard
1. Displays connected wallet address
2. Shows real-time ETH and USDC balances
3. Lists recent swap and bridge transactions
4. Provides transaction links for exploration

## 🔐 Security Considerations

- ✅ All transactions signed by user wallet
- ✅ Slippage protection on swaps
- ✅ Balance validation before operations
- ✅ Testnet-only (no real funds at risk)
- ✅ Standard ERC-20 interactions
- ✅ Uniswap V2 battle-tested contracts

## 🚨 Important Notes

- This is a **testnet application** using Sepolia and Arc testnets
- No real money is involved - use only testnet tokens
- Always verify contract addresses before transactions
- Transactions are public and visible on block explorers

## 📖 API Reference

### useSwapContract
```typescript
const { getAmountsOut, executeSwap, isLoading, error } = useSwapContract(provider)

// Get estimated output amount
const estimatedOut = await getAmountsOut(amountIn, tokenIn, tokenOut)

// Execute swap
const result = await executeSwap({
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: '1.5',
  minAmountOut: '2400',
  recipient: '0x...',
  slippage: 0.5
})
```

### useBridgeContract
```typescript
const { getTokenBalance, approveToken, executeBridge, isLoading } = useBridgeContract(provider)

// Get token balance
const balance = await getTokenBalance(tokenAddress, account)

// Approve token transfer
const txHash = await approveToken(tokenAddress, spender, amount)

// Execute bridge
const result = await executeBridge({
  tokenAddress: '0x...',
  amount: '100',
  destinationChain: 'arc-testnet',
  recipient: '0x...'
})
```

## � Useful Links

- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)
- [ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)
- [Sepolia Testnet Faucet](https://www.sepoliafaucet.com/)
- [Circle Bridge Kit](https://developers.circle.com/bridge-kit)

## �📝 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check code quality
npm run lint
```

## 🐛 Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask is installed and enabled
- Switch to Sepolia testnet in MetaMask
- Clear browser cache and refresh
- Try disconnecting and reconnecting wallet

### Swap Fails
- Verify you have enough ETH for gas fees
- Check slippage tolerance setting
- Ensure sufficient token balance
- Verify Uniswap pair liquidity

### Bridge Not Working
- Requires Circle Bridge Kit API configuration
- Ensure sufficient USDC balance
- Check network connectivity
- Verify Arc testnet RPC availability

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Last Updated**: November 2, 2025
**Network**: Sepolia Testnet + Arc Testnet
**Status**: Active Development
