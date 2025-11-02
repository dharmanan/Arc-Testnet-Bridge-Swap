import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { Card, Container } from './ui'
import { Wallet, TrendingUp, Loader2 } from 'lucide-react'
import { useBridgeKit, SEPOLIA_CHAIN_ID, ARC_CHAIN_ID } from '../hooks/useBridgeKit'

export function DashboardTab() {
  const { address, isConnected, chainId } = useAccount()
  const { fetchTokenBalance, tokenBalance: sepoliaBalance, isLoadingBalance: sepoliaLoading } = useBridgeKit()
  const [arcBalance, setArcBalance] = useState('0.00')
  const [arcLoading, setArcLoading] = useState(false)

  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      // Fetch Sepolia balance
      fetchTokenBalance('USDC', SEPOLIA_CHAIN_ID)
      
      // Mock Arc balance for now
      setArcLoading(true)
      setTimeout(() => {
        setArcBalance('500.00')
        setArcLoading(false)
      }, 1000)
    }
  }, [address, isConnected, fetchTokenBalance])

  if (!isConnected) {
    return (
      <Container className="py-12">
        <Card className="text-center">
          <Wallet size={48} className="mx-auto mb-4 text-dark-400" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-dark-400">Connect your wallet to see your balances and transaction history</p>
        </Card>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>

        {/* Account Info */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Account</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-dark-400">Address</span>
              <span className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Current Network</span>
              <span className="font-semibold">
                {chainId === SEPOLIA_CHAIN_ID ? 'Sepolia' : chainId === ARC_CHAIN_ID ? 'Arc Testnet' : 'Bilinmeyen Ağ'}
              </span>
            </div>
          </div>
        </Card>

        {/* Balances */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Balances
          </h3>
          <div className="space-y-3">
            {/* Sepolia USDC */}
            <div className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
              <div>
                <p className="font-semibold">USDC (Sepolia)</p>
                <p className="text-sm text-dark-400">Ethereum Sepolia Testnet</p>
              </div>
              <div className="text-right">
                {sepoliaLoading ? (
                  <Loader2 size={16} className="animate-spin ml-auto" />
                ) : (
                  <span className="text-lg font-semibold">{sepoliaBalance} USDC</span>
                )}
              </div>
            </div>

            {/* Arc USDC */}
            <div className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
              <div>
                <p className="font-semibold">USDC (Arc)</p>
                <p className="text-sm text-dark-400">Arc Testnet</p>
              </div>
              <div className="text-right">
                {arcLoading ? (
                  <Loader2 size={16} className="animate-spin ml-auto" />
                ) : (
                  <span className="text-lg font-semibold">{arcBalance} USDC</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Bridge Statistics */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Bridge Transactions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-dark-400 text-sm mb-1">Sepolia → Arc</p>
              <p className="text-2xl font-bold text-green-400">0</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-dark-400 text-sm mb-1">Arc → Sepolia</p>
              <p className="text-2xl font-bold text-blue-400">0</p>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="text-center py-8 text-dark-400">
            <p>No recent transactions</p>
          </div>
        </Card>
      </div>
    </Container>
  )
}
