import { useState, useCallback, useEffect } from 'react'
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import { SEPOLIA_EVM_CHAIN_ID } from '../lib/chains'
import { logger } from '../lib/logger'

// Sepolia Testnet Configuration
const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_EVM_CHAIN_ID,
  UNISWAP_V2_ROUTER: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
  USDC_ADDRESS: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  WETH_ADDRESS: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
}

const SEPOLIA_NETWORK_ERROR = 'Switch your wallet to Ethereum Sepolia to load swap balances and quotes.'

const ROUTER_ABI = [
  'function WETH() external pure returns (address)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
]

interface Eip1193RequestArguments {
  method: string
  params?: unknown[] | Record<string, unknown>
}

export interface SwapState {
  inputAmount: string
  outputAmount: string
  isEthToUsdc: boolean
  error: string | null
  status: string | null
  txHash: string | null
  isLoading: boolean
  ethBalance: string | null
  usdcBalance: string | null
  isLoadingBalance: boolean
  ethSwapLimitReached: boolean
  ethSwapUsedToday: string
}

export function useSwap() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  const [state, setState] = useState<SwapState>({
    inputAmount: '',
    outputAmount: '',
    isEthToUsdc: true,
    error: null,
    status: null,
    txHash: null,
    isLoading: false,
    ethBalance: null,
    usdcBalance: null,
    isLoadingBalance: false,
    ethSwapLimitReached: false,
    ethSwapUsedToday: '0',
  })

  const getWalletProvider = useCallback(async () => {
    if (!walletClient) {
      return null
    }

    return new ethers.BrowserProvider(
      {
        request: async ({ method, params }: Eip1193RequestArguments) => {
          return walletClient.transport.request({ method, params } as never)
        },
      },
      {
        chainId: walletClient.chain.id,
        name: walletClient.chain.name,
        ensAddress: walletClient.chain.contracts?.ensRegistry?.address,
      },
    )
  }, [walletClient])

  const getReadProvider = useCallback(async () => {
    const walletProvider = await getWalletProvider()

    if (!walletProvider) {
      throw new Error('Connected wallet provider is not available. Reconnect your wallet and try again.')
    }

    if (chainId === SEPOLIA_CONFIG.chainId) {
      return walletProvider
    }

    throw new Error(SEPOLIA_NETWORK_ERROR)
  }, [chainId, getWalletProvider])

  useEffect(() => {
    if (!address) return

    if (chainId !== SEPOLIA_CONFIG.chainId) {
      setState(prev => ({
        ...prev,
        ethBalance: null,
        usdcBalance: null,
        outputAmount: '',
        isLoadingBalance: false,
        error: SEPOLIA_NETWORK_ERROR,
      }))
      return
    }

    setState(prev => {
      if (prev.error !== SEPOLIA_NETWORK_ERROR) {
        return prev
      }

      return {
        ...prev,
        error: null,
      }
    })
  }, [address, chainId])

  // Fetch ETH and USDC balances
  const fetchBalances = useCallback(async () => {
    if (!address) return

    setState(prev => ({ ...prev, isLoadingBalance: true }))

    try {
      const provider = await getReadProvider()

      // Fetch ETH balance
      const ethBalance = await provider.getBalance(address)
      const ethBalanceFormatted = ethers.formatEther(ethBalance)

      // Fetch USDC balance
      const usdcContract = new ethers.Contract(
        SEPOLIA_CONFIG.USDC_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      )
      const usdcBalance = await usdcContract.balanceOf(address)
      const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6)

      setState(prev => ({
        ...prev,
        ethBalance: ethBalanceFormatted,
        usdcBalance: usdcBalanceFormatted,
        error: null,
        isLoadingBalance: false,
      }))
    } catch (error) {
      logger.error('Error fetching balances:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Sepolia balances.'

      setState(prev => ({
        ...prev,
        ethBalance: null,
        usdcBalance: null,
        error: errorMessage,
        isLoadingBalance: false,
      }))
    }
  }, [address, getReadProvider])

  // Rate limiting for ETH to USDC swaps (0.1 ETH per 24 hours)
  const checkEthSwapLimit = useCallback(() => {
    if (!address) return

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const key = `eth_swaps_${address}`

    try {
      const stored = localStorage.getItem(key)
      const swapHistory = stored ? JSON.parse(stored) : []

      // Filter swaps from last 24 hours
      const recentSwaps = swapHistory.filter((swap: any) => 
        now - swap.timestamp < oneDay
      )

      // Calculate total ETH used in last 24 hours
      const totalEthUsed = recentSwaps.reduce((sum: number, swap: any) => 
        sum + parseFloat(swap.amount), 0
      )

      const limitReached = totalEthUsed >= 0.1

      setState(prev => ({
        ...prev,
        ethSwapLimitReached: limitReached,
        ethSwapUsedToday: totalEthUsed.toFixed(4),
      }))

      // Update localStorage with filtered history
      localStorage.setItem(key, JSON.stringify(recentSwaps))
    } catch (error) {
      logger.error('Error checking ETH swap limit:', error)
      setState(prev => ({
        ...prev,
        ethSwapLimitReached: false,
        ethSwapUsedToday: '0',
      }))
    }
  }, [address])

  // Check limit when address changes
  useEffect(() => {
    if (address) {
      checkEthSwapLimit()
    }
  }, [address, checkEthSwapLimit])

  // Estimate output amount
  const estimateOutput = useCallback(async (inputAmount: string) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setState(prev => ({ ...prev, outputAmount: '' }))
      return
    }

    try {
      const provider = await getReadProvider()

      const router = new ethers.Contract(
        SEPOLIA_CONFIG.UNISWAP_V2_ROUTER,
        ROUTER_ABI,
        provider
      )

      const path = state.isEthToUsdc
        ? [SEPOLIA_CONFIG.WETH_ADDRESS, SEPOLIA_CONFIG.USDC_ADDRESS]
        : [SEPOLIA_CONFIG.USDC_ADDRESS, SEPOLIA_CONFIG.WETH_ADDRESS]

      const amountIn = state.isEthToUsdc
        ? ethers.parseEther(inputAmount)
        : ethers.parseUnits(inputAmount, 6)
      
      logger.debug('Estimating swap:', {
        inputAmount,
        direction: state.isEthToUsdc ? 'ETH->USDC' : 'USDC->ETH',
        amountIn: amountIn.toString(),
        path
      })
      
      const amounts = await router.getAmountsOut(amountIn, path)
      
      if (!amounts || amounts.length < 2 || !amounts[1]) {
        throw new Error('Invalid router response')
      }
      
      const outputDecimals = state.isEthToUsdc ? 6 : 18
      const outputFormatted = ethers.formatUnits(amounts[1], outputDecimals)
      
      logger.debug('Estimated output:', outputFormatted)
      
      if (parseFloat(outputFormatted) <= 0) {
        throw new Error('Output amount too small')
      }
      
      setState(prev => ({ ...prev, outputAmount: outputFormatted, error: null }))
    } catch (error) {
      logger.error('Error estimating output:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to estimate swap output. Please try again.'
      
      setState(prev => ({ 
        ...prev, 
        outputAmount: '', 
        error: errorMessage,
      }))
    }
  }, [getReadProvider, state.isEthToUsdc])

  const setInputAmount = useCallback((amount: string) => {
    setState(prev => ({ ...prev, inputAmount: amount }))
    estimateOutput(amount)
  }, [estimateOutput])

  const toggleDirection = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEthToUsdc: !prev.isEthToUsdc,
      inputAmount: '',
      outputAmount: '',
    }))
  }, [])

  const executeSwap = useCallback(async () => {
    if (!address) {
      setState(prev => ({
        ...prev,
        error: 'Please connect your wallet',
        status: null,
      }))
      return
    }

    if (chainId !== SEPOLIA_CONFIG.chainId) {
      try {
        await switchChain({ chainId: SEPOLIA_CONFIG.chainId })
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: 'Failed to switch to Sepolia',
          status: null,
        }))
        return
      }
    }

    if (!state.inputAmount || parseFloat(state.inputAmount) <= 0) {
      setState(prev => ({
        ...prev,
        error: 'Please enter a valid amount',
        status: null,
      }))
      return
    }

    // Check ETH swap limit for ETH to USDC swaps
    if (state.isEthToUsdc) {
      const requestedAmount = parseFloat(state.inputAmount)
      const currentUsed = parseFloat(state.ethSwapUsedToday)
      
      if (state.ethSwapLimitReached || (currentUsed + requestedAmount) > 0.1) {
        setState(prev => ({
          ...prev,
          error: `Daily ETH swap limit exceeded. Used: ${state.ethSwapUsedToday} ETH, Limit: 0.1 ETH per 24 hours.`,
          status: null,
        }))
        return
      }
    }

    // Note: outputAmount validation removed because button is now disabled when outputAmount is invalid

    setState(prev => ({
      ...prev,
      error: null,
      status: 'Initiating swap...',
      txHash: null,
      isLoading: true,
    }))

    try {
      const provider = await getWalletProvider()
      if (!provider) throw new Error('Wallet provider not available')

      const signer = await provider.getSigner()
      const router = new ethers.Contract(
        SEPOLIA_CONFIG.UNISWAP_V2_ROUTER,
        ROUTER_ABI,
        signer
      )

      const wethAddress = await router.WETH()
      const path = state.isEthToUsdc
        ? [wethAddress, SEPOLIA_CONFIG.USDC_ADDRESS]
        : [SEPOLIA_CONFIG.USDC_ADDRESS, wethAddress]

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Calculate minAmountOut directly to avoid stale state issues
      const amountIn = state.isEthToUsdc
        ? ethers.parseEther(state.inputAmount)
        : ethers.parseUnits(state.inputAmount, 6)
      
      const amounts = await router.getAmountsOut(amountIn, path)
      const outputDecimals = state.isEthToUsdc ? 6 : 18
      const estimatedOutputRaw = ethers.formatUnits(amounts[1], outputDecimals)
      const estimatedOutput = state.isEthToUsdc
        ? ethers.parseUnits(estimatedOutputRaw, 6)
        : ethers.parseEther(estimatedOutputRaw)
      
      const minAmountOut = estimatedOutput * BigInt(95) / BigInt(100) // 5% slippage tolerance

      let tx

      if (state.isEthToUsdc) {
        setState(prev => ({ ...prev, status: 'Swapping ETH for USDC...' }))
        
        tx = await router.swapExactETHForTokens(
          minAmountOut,
          path,
          address,
          deadline,
          { value: amountIn }
        )
      } else {
        setState(prev => ({ ...prev, status: 'Approving USDC spend...' }))
        
        const usdcContract = new ethers.Contract(
          SEPOLIA_CONFIG.USDC_ADDRESS,
          ERC20_ABI,
          signer
        )

        const allowance = await usdcContract.allowance(
          address,
          SEPOLIA_CONFIG.UNISWAP_V2_ROUTER
        )

        if (allowance < amountIn) {
          const approveTx = await usdcContract.approve(
            SEPOLIA_CONFIG.UNISWAP_V2_ROUTER,
            amountIn
          )
          await approveTx.wait()
        }

        setState(prev => ({ ...prev, status: 'Swapping USDC for ETH...' }))
        
        tx = await router.swapExactTokensForETH(
          amountIn,
          minAmountOut,
          path,
          address,
          deadline
        )
      }

      setState(prev => ({
        ...prev,
        status: 'Waiting for transaction confirmation...',
        txHash: tx.hash,
      }))

      await tx.wait()

      // Record successful ETH to USDC swap for rate limiting
      if (state.isEthToUsdc && address) {
        const key = `eth_swaps_${address}`
        try {
          const stored = localStorage.getItem(key)
          const swapHistory = stored ? JSON.parse(stored) : []
          
          swapHistory.push({
            timestamp: Date.now(),
            amount: state.inputAmount,
            txHash: tx.hash
          })
          
          localStorage.setItem(key, JSON.stringify(swapHistory))
          
          // Update limit status
          checkEthSwapLimit()
        } catch (error) {
          logger.error('Error recording swap history:', error)
        }
      }

      setState(prev => ({
        ...prev,
        status: 'Swap successful!',
        isLoading: false,
        inputAmount: '',
        outputAmount: '',
      }))

      // Clear success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: null,
        }))
      }, 5000)
    } catch (error) {
      logger.error('Swap failed:', error)
      
      let errorMessage = 'An unknown error occurred'
      
      if (error instanceof Error) {
        if (
          error.message.includes('user rejected') ||
          error.message.includes('ACTION_REJECTED')
        ) {
          errorMessage = 'Swap failed: Transaction rejected'
        } else if (error.message.includes('INSUFFICIENT_FUNDS')) {
          errorMessage = 'Swap failed: Insufficient funds'
        } else if (error.message.includes('transaction failed')) {
          errorMessage = 'Swap failed: Transaction failed'
        } else {
          errorMessage = `Swap failed: ${error.message}`
        }
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        status: null,
        isLoading: false,
      }))
    }
  }, [address, chainId, switchChain, state.inputAmount, state.isEthToUsdc, getWalletProvider])

  return {
    state,
    setInputAmount,
    toggleDirection,
    executeSwap,
    fetchBalances,
    setOutputAmount: (amount: string) => setState(prev => ({ ...prev, outputAmount: amount })),
  }
}
