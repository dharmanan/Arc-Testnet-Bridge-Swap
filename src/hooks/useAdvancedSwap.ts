import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { SWAP_CONFIG, TOKEN_CONFIG, UNISWAP_CONFIG } from '../config'
import { calculateMinimumAmount } from '../utils'

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

export interface UseSwapHookOptions {
  tokenIn: { address: string; decimals: number }
  tokenOut: { address: string; decimals: number }
  amountIn: string
  slippage: number
}

export interface SwapEstimate {
  amountOut: string
  priceImpact: number
  gasEstimate: bigint
}

export function useAdvancedSwap(options: UseSwapHookOptions) {
  const { address } = useAccount()

  const [estimate, setEstimate] = useState<SwapEstimate | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>(null)

  // Initialize provider
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum)
      setProvider(ethProvider)
    }
  }, [])

  // Estimate swap
  const estimateSwap = useCallback(async () => {
    if (!provider || !options.amountIn || options.amountIn === '0') {
      setEstimate(null)
      return
    }

    setIsEstimating(true)
    setError(null)

    try {
      const router = new ethers.Contract(
        UNISWAP_CONFIG.ROUTER_ADDRESS,
        ROUTER_ABI,
        provider
      )

      const amountInWei = ethers.parseUnits(options.amountIn, options.tokenIn.decimals)
      const path = [options.tokenIn.address, options.tokenOut.address]

      const amounts = await router.getAmountsOut(amountInWei, path)
      const amountOutWei = amounts[amounts.length - 1]
      const amountOut = ethers.formatUnits(amountOutWei, options.tokenOut.decimals)

      // Calculate price impact
      const inputUsd = parseFloat(options.amountIn)
      const outputUsd = parseFloat(amountOut)
      const priceImpact = inputUsd > 0 ? ((inputUsd - outputUsd) / inputUsd) * 100 : 0

      setEstimate({
        amountOut,
        priceImpact: Math.max(0, priceImpact),
        gasEstimate: SWAP_CONFIG as any, // Placeholder
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Estimation failed'
      setError(errorMessage)
      console.error('Estimation error:', err)
      setEstimate(null)
    } finally {
      setIsEstimating(false)
    }
  }, [provider, options, SWAP_CONFIG])

  // Re-estimate when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateSwap()
    }, 500)

    return () => clearTimeout(timer)
  }, [options.amountIn, estimateSwap])

  // Execute swap
  const executeSwap = useCallback(async () => {
    if (!address || !provider || !estimate) {
      setError('Missing swap parameters')
      return
    }

    setIsSwapping(true)
    setError(null)

    try {
      const signer = await provider.getSigner()
      const router = new ethers.Contract(
        UNISWAP_CONFIG.ROUTER_ADDRESS,
        ROUTER_ABI,
        signer
      )

      const amountInWei = ethers.parseUnits(options.amountIn, options.tokenIn.decimals)
      const minAmountOut = ethers.parseUnits(
        calculateMinimumAmount(estimate.amountOut, options.slippage),
        options.tokenOut.decimals
      )

      const path = [options.tokenIn.address, options.tokenOut.address]
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      let tx

      // Handle ERC20 approval if needed
      if (options.tokenIn.address.toLowerCase() !== TOKEN_CONFIG.WETH.address.toLowerCase()) {
        const token = new ethers.Contract(options.tokenIn.address, ERC20_ABI, signer)
        const allowance = await token.allowance(address, UNISWAP_CONFIG.ROUTER_ADDRESS)

        if (allowance < amountInWei) {
          const approveTx = await token.approve(UNISWAP_CONFIG.ROUTER_ADDRESS, ethers.MaxUint256)
          await approveTx.wait()
        }

        // Token to Token swap
        tx = await router.swapExactTokensForTokens(
          amountInWei,
          minAmountOut,
          path,
          address,
          deadline
        )
      } else {
        // ETH to Token swap
        tx = await router.swapExactETHForTokens(
          minAmountOut,
          path,
          address,
          deadline,
          { value: amountInWei }
        )
      }

      await tx.wait()
      return { hash: tx.hash, success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed'
      setError(errorMessage)
      console.error('Swap error:', err)
      throw err
    } finally {
      setIsSwapping(false)
    }
  }, [address, provider, estimate, options])

  return {
    estimate,
    isEstimating,
    isSwapping,
    error,
    executeSwap,
    estimateSwap,
  }
}
