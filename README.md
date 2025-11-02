# Arc Sepolia DEX Bridge

A **production-ready** decentralized exchange and cross-chain bridge application featuring **real on-chain transactions**. Swap Sepolia ETH to USDC using Uniswap V2, then bridge USDC to Arc Testnet using Circle Bridge Kit.

## ✨ Key Features

### 🔄 Real Uniswap V2 Swap (Sepolia)
- **Live ETH ↔ USDC swapping** on Sepolia testnet
- Real-time price estimation using Uniswap V2 Router
- Actual on-chain transactions (not mock)
- ERC20 token approval + swap execution
- Etherscan transaction links
- Bidirectional: ETH → USDC or USDC → ETH
- Full error handling and user feedback

### 🌉 Real Circle Bridge Kit (Bidirectional)
- **Live bidirectional USDC bridging**: Sepolia ↔ Arc Testnet
- @circle-fin/bridge-kit official integration
- Automatic chain switching
- Real transaction hashes for source and destination
- Dual Etherscan + ArcScan links
- Proper bridge state progression
- Comprehensive error handling

### 📊 Dashboard Tab
- **Wallet Information** - Connected address and network
- **USDC Balances** - Real balances on Sepolia and Arc Testnet

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- **MetaMask wallet**
- **Sepolia testnet ETH** (from [Sepolia faucet](https://www.sepoliafaucet.io))
- **Sepolia testnet USDC** (from [Circle faucet](https://faucet.circle.com))
- **Arc Testnet added to MetaMask** (manual setup required)

### Manual Arc Testnet Setup
Add Arc Testnet to MetaMask:
- **Network Name**: Arc Testnet
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **Currency Symbol**: `USDC`
- **Block Explorer**: `https://testnet.arcscan.app`

### Installation

```bash
# Clone and install
git clone <repository-url>
cd Arc-Testnet-Bridge-Swap
npm install

# Start development server (port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser with MetaMask connected to Sepolia.

### Build for Production

```bash
npm run build
```

## 🌐 Supported Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Ethereum Sepolia | 11155111 | https://rpc.sepolia.org | https://sepolia.etherscan.io |
| Arc Testnet | 5042002 | https://rpc.testnet.arc.network | https://testnet.arcscan.app |

## 📋 Token Addresses

### Sepolia
| Token | Address |
|-------|---------|
| WETH | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` |
| USDC (Bridge Kit) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

### Arc Testnet
| Token | Address |
|-------|---------|
| USDC (Native) | `0x3600000000000000000000000000000000000000` |

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript 5.2, Vite 4.5.14
- **Styling**: Tailwind CSS 3.3
- **Icons**: Lucide React
- **Wallet**: wagmi 2.5.0, @rainbow-me/rainbowkit 2.1.0
- **Web3**: ethers.js v6.7.1, viem 2.0.0
- **DEX**: Uniswap V2 SDK
- **Bridge**: @circle-fin/bridge-kit, @circle-fin/adapter-viem-v2
- **Animations**: framer-motion, canvas-confetti

## 📂 Project Structure

```
src/
├── components/
│   ├── SwapTab.tsx       # Uniswap V2 swap interface
│   ├── BridgeTab.tsx     # Circle Bridge Kit interface  
│   ├── DashboardTab.tsx  # Account & balances dashboard
│   └── ui/               # UI components
├── hooks/
│   ├── useSwap.ts        # Uniswap V2 swap logic
│   └── useBridgeKit.ts   # Circle Bridge Kit logic
├── App.tsx
└── main.tsx
```

## 🔄 Complete Workflow

```
1. Connect MetaMask Wallet (Sepolia)
   ↓
2. Go to Swap Tab
   - Select ETH → USDC direction
   - Enter amount
   - Approve + sign swap
   ✅ Get real USDC on Sepolia (Etherscan link provided)
   ↓
3. Go to Bridge Tab
   - Select Sepolia → Arc direction
   - Enter USDC amount
   - Approve + sign bridge
   ✅ Get native USDC on Arc Testnet (ArcScan link provided)
   ↓
4. View on Dashboard
   - See balances on both chains
   - Access transaction links
```

## 🔗 Important Smart Contract Addresses

| Contract | Address | Network |
|----------|---------|---------|
| Uniswap V2 Router | `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008` | Sepolia |
| USDC (Bridge Kit) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Sepolia |
| USDC (Native) | `0x3600000000000000000000000000000000000000` | Arc |

## 🔐 Security Notes

- ✅ All transactions signed by user wallet
- ✅ Testnet-only (no real funds)
- ✅ Standard ERC-20 and Uniswap V2 contracts
- ✅ Circle Bridge Kit production-grade
- ⚠️ Always verify addresses before approving

## 📖 Available Scripts

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🐛 Troubleshooting

**Wallet Connection**
- Ensure MetaMask connected to Sepolia testnet
- Add Arc Testnet manually if not available

**Bridge Not Working**
- Ensure sufficient USDC balance on Sepolia
- Check both chains are configured in MetaMask
- Verify Bridge Kit supported

**Swap Fails**
- Check you have enough ETH for gas
- Verify sufficient token balance
- Check Uniswap liquidity

## 📝 Additional Resources

- [See all features](./FEATURES.md)
- [Uniswap V2 Docs](https://docs.uniswap.org/contracts/v2/)
- [Circle Bridge Kit Docs](https://developers.circle.com/bridge-kit)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [wagmi Documentation](https://wagmi.sh/)

## 📄 License

MIT

---

**Last Updated**: November 2025
**Status**: Production Ready ✅
**Networks**: Sepolia + Arc Testnet

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
