import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { Card, Button, Input, Container } from './ui'
import { SUSHISWAP_SEPOLIA } from '../config/networks'
import { ArrowDownUp } from 'lucide-react'

// Uniswap V2 Router ABI (minimal)
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
]

// ERC20 ABI minimal
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

export function SwapTab() {
  const { address } = useAccount()
  const [amountIn, setAmountIn] = useState('')
  const [estimatedOut, setEstimatedOut] = useState<string>('')
  const [isReversed, setIsReversed] = useState(false)
  const [slippage, setSlippage] = useState('0.5')
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  // Setup provider
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum)
      setProvider(ethProvider)
    }
  }, [])

  const tokenIn = isReversed ? SUSHISWAP_SEPOLIA.USDC : SUSHISWAP_SEPOLIA.WETH
  const tokenOut = isReversed ? SUSHISWAP_SEPOLIA.WETH : SUSHISWAP_SEPOLIA.USDC
  const tokenInSymbol = isReversed ? 'DAI' : 'ETH'
  const tokenOutSymbol = isReversed ? 'ETH' : 'DAI'
  const decimalsIn = isReversed ? 18 : 18
  const decimalsOut = isReversed ? 18 : 18

  // Estimate swap output
  const estimateSwap = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setEstimatedOut('')
      return
    }

    try {
      // Mock estimation - 1 ETH ≈ 2500 DAI
      const ethAmount = parseFloat(amountIn)
      let estimatedAmount: string
      
      if (isReversed) {
        // DAI → ETH: 1 DAI ≈ 0.0004 ETH
        estimatedAmount = (ethAmount * 0.0004).toFixed(6)
      } else {
        // ETH → DAI: 1 ETH ≈ 2500 DAI
        estimatedAmount = (ethAmount * 2500).toFixed(2)
      }
      
      setEstimatedOut(estimatedAmount)
    } catch (error) {
      console.error('Estimation error:', error)
      setEstimatedOut('')
    }
  }

  // Re-estimate when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateSwap()
    }, 500)

    return () => clearTimeout(timer)
  }, [amountIn, isReversed])

  const handleSwap = async () => {
    if (!address || !amountIn || !estimatedOut) {
      alert('Missing swap details')
      return
    }

    setIsLoading(true)
    try {
      // Mock swap - simulate 2 second transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert(`✅ Swap Successful!\n\nFrom: ${amountIn} ${tokenInSymbol}\nTo: ${estimatedOut} ${tokenOutSymbol}\n\nNote: Demo mode - no real transaction`)
      
      setAmountIn('')
      setEstimatedOut('')
    } catch (error) {
      console.error('Swap error:', error)
      alert('❌ Swap failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <h2 className="text-2xl font-bold mb-6">Swap Tokens</h2>

          <div className="space-y-4">
            {/* Amount In */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-dark-300">From</label>
                <span className="text-xs text-dark-400">Balance: {isReversed ? '1250.00' : '0.50'}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountIn(e.target.value)}
                  className="flex-1"
                />
                <button className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg font-semibold transition-colors">
                  {tokenInSymbol}
                </button>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsReversed(!isReversed)}
                className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
              >
                <ArrowDownUp size={20} />
              </button>
            </div>

            {/* Amount Out */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-dark-300">To</label>
                <span className="text-xs text-dark-400">Balance: {isReversed ? '0.50' : '1250.00'}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={estimatedOut}
                  disabled
                  className="flex-1"
                />
                <button className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg font-semibold transition-colors">
                  {tokenOutSymbol}
                </button>
              </div>
              {estimatedOut && (
                <p className="text-xs text-dark-400 mt-1">
                  Price: 1 {tokenInSymbol} = {(parseFloat(estimatedOut) / parseFloat(amountIn)).toFixed(6)} {tokenOutSymbol}
                </p>
              )}
            </div>

            {/* Slippage */}
            <div>
              <label className="text-sm font-medium text-dark-300 block mb-2">
                Slippage Tolerance: {slippage}%
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Swap Button */}
            <Button
              onClick={handleSwap}
              loading={isLoading}
              disabled={!address || !amountIn || !estimatedOut || isLoading}
              className="w-full mt-6"
            >
              {!address ? 'Connect Wallet' : isLoading ? 'Swapping...' : 'Swap'}
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  )
}
