import { useCallback, useState } from 'react'
import { ethers } from 'ethers'

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
]

export interface BridgeParams {
  tokenAddress: string
  amount: string
  destinationChain: string
  recipient: string
}

export interface BridgeResult {
  transactionHash: string
  amount: string
  timestamp: number
  status: 'pending' | 'confirmed'
}

export function useBridgeContract(provider: ethers.BrowserProvider | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTokenBalance = useCallback(
    async (tokenAddress: string, account: string): Promise<string> => {
      if (!provider) throw new Error('Provider not initialized')

      try {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
        const balance = await token.balanceOf(account)
        const decimals = await token.decimals()

        return ethers.formatUnits(balance, decimals)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get balance'
        throw new Error(message)
      }
    },
    [provider]
  )

  const approveToken = useCallback(
    async (tokenAddress: string, spenderAddress: string, amount: string): Promise<string> => {
      if (!provider) throw new Error('Provider not initialized')

      setIsLoading(true)
      setError(null)

      try {
        const signer = await provider.getSigner()
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

        const decimals = await token.decimals()
        const amountWei = ethers.parseUnits(amount, decimals)

        const tx = await token.approve(spenderAddress, amountWei)
        const receipt = await tx.wait()

        if (!receipt) throw new Error('Approval failed')

        return tx.hash
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Approval failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [provider]
  )

  const executeBridge = useCallback(
    async (params: BridgeParams): Promise<BridgeResult> => {
      if (!provider) throw new Error('Provider not initialized')

      setIsLoading(true)
      setError(null)

      try {
        await provider.getSigner()

        // For now, this is a placeholder for Circle Bridge Kit integration
        // In production, you would:
        // 1. Approve the bridge contract
        // 2. Call the bridge contract's bridge function
        // 3. Monitor cross-chain confirmation

        console.log('Bridge execution initiated:', params)

        return {
          transactionHash: '0x' + Math.random().toString(16).slice(2),
          amount: params.amount,
          timestamp: Date.now(),
          status: 'pending',
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Bridge failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [provider]
  )

  return {
    getTokenBalance,
    approveToken,
    executeBridge,
    isLoading,
    error,
  }
}
