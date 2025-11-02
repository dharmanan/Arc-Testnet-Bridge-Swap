import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { BRIDGE_CONFIG } from '../config'

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

export interface UseBridgeHookOptions {
  tokenAddress: string
  amount: string
  decimals: number
  destChain: number
}

export interface BridgeEstimate {
  fee: string
  estimatedTime: string
  gasEstimate: bigint
}

export function useAdvancedBridge(options: UseBridgeHookOptions) {
  const { address } = useAccount()

  const [estimate, setEstimate] = useState<BridgeEstimate | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [isBridging, setIsBridging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Initialize provider
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum)
      setProvider(ethProvider)
    }
  }, [])

  // Estimate bridge
  const estimateBridge = useCallback(async () => {
    if (!options.amount || options.amount === '0') {
      setEstimate(null)
      return
    }

    setIsEstimating(true)
    setError(null)

    try {
      // Basic estimate - in production would call bridge API
      const amountNum = parseFloat(options.amount)
      
      // Fee calculation (example: 0.1% for testnet)
      const feePercentage = 0.001
      const fee = (amountNum * feePercentage).toFixed(options.decimals)

      // Estimated time (5-10 minutes for testnet)
      const estimatedTime = '5-10 minutes'

      setEstimate({
        fee,
        estimatedTime,
        gasEstimate: 300000n,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Estimation failed'
      setError(errorMessage)
      console.error('Bridge estimation error:', err)
      setEstimate(null)
    } finally {
      setIsEstimating(false)
    }
  }, [options])

  // Re-estimate when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateBridge()
    }, 500)

    return () => clearTimeout(timer)
  }, [options.amount, estimateBridge])

  // Execute bridge
  const executeBridge = useCallback(async (recipientAddress?: string) => {
    if (!address || !provider || !options.amount) {
      setError('Missing bridge parameters')
      return
    }

    setIsBridging(true)
    setError(null)
    setTxHash(null)

    try {
      const signer = await provider.getSigner()
      const recipient = recipientAddress || address

      // Approve token for bridge contract
      const token = new ethers.Contract(
        options.tokenAddress,
        ERC20_ABI,
        signer
      )

      const amountWei = ethers.parseUnits(options.amount, options.decimals)

      // Check and approve if needed
      const allowance = await token.allowance(
        address,
        BRIDGE_CONFIG.CIRCLE_APP_ID || address
      )

      if (allowance < amountWei) {
        const approveTx = await token.approve(
          BRIDGE_CONFIG.CIRCLE_APP_ID || address,
          ethers.MaxUint256
        )
        await approveTx.wait()
      }

      // In production, would call actual bridge contract
      // For now, simulate successful bridge initiation
      console.log('Bridge initiated:', {
        token: options.tokenAddress,
        amount: options.amount,
        from: address,
        to: recipient,
        destChain: options.destChain,
      })

      // Mock tx hash for demo
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      setTxHash(mockTxHash)

      return { hash: mockTxHash, success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bridge failed'
      setError(errorMessage)
      console.error('Bridge error:', err)
      throw err
    } finally {
      setIsBridging(false)
    }
  }, [address, provider, options])

  return {
    estimate,
    isEstimating,
    isBridging,
    error,
    txHash,
    executeBridge,
    estimateBridge,
  }
}

/**
 * Get bridge status from transaction hash
 */
export async function getBridgeStatus(
  provider: ethers.BrowserProvider,
  txHash: string
): Promise<{
  status: 'pending' | 'completed' | 'failed'
  confirmations: number
  receipt: ethers.TransactionReceipt | null
}> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash)

    if (!receipt) {
      return { status: 'pending', confirmations: 0, receipt: null }
    }

    const currentBlock = await provider.getBlockNumber()
    const confirmations = currentBlock - receipt.blockNumber

    return {
      status: receipt.status === 1 ? 'completed' : 'failed',
      confirmations,
      receipt,
    }
  } catch (error) {
    console.error('Get bridge status error:', error)
    throw error
  }
}
