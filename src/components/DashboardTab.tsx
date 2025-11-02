import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { Card, Container } from './ui'
import { Wallet, TrendingUp, Loader2 } from 'lucide-react'
import { useBridgeKit, SEPOLIA_CHAIN_ID, ARC_CHAIN_ID } from '../hooks/useBridgeKit'

interface Transaction {
  id: string;
  type: string;
  direction: 'sepolia-to-arc' | 'arc-to-sepolia';
  amount: string;
  fromNetwork: string;
  toNetwork: string;
  timestamp: string;
  sourceTxHash?: string;
  receiveTxHash?: string;
}

export function DashboardTab() {
  const { address, isConnected, chainId } = useAccount()
  const { fetchTokenBalance, tokenBalance: sepoliaBalance, isLoadingBalance: sepoliaLoading } = useBridgeKit()
  const { fetchTokenBalance: fetchArcBalance, tokenBalance: arcBalance, isLoadingBalance: arcLoading } = useBridgeKit()

  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      // Fetch Sepolia balance
      fetchTokenBalance('USDC', SEPOLIA_CHAIN_ID)
      
      // Fetch Arc balance
      fetchArcBalance('USDC', ARC_CHAIN_ID)
    }
  }, [address, isConnected, fetchTokenBalance, fetchArcBalance])

  // Load transactions from localStorage
  useEffect(() => {
    const savedTransactions = JSON.parse(localStorage.getItem('bridgeTransactions') || '[]')
    setTransactions(savedTransactions)
  }, [])

  // Calculate bridge statistics
  const sepoliaToArcCount = transactions.filter(t => t.direction === 'sepolia-to-arc').length
  const arcToSepoliaCount = transactions.filter(t => t.direction === 'arc-to-sepolia').length

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
            <div className="flex justify-between items-center p-3 bg-arc-dark-700 rounded-lg">
              <div>
                <p className="font-semibold">USDC (Sepolia)</p>
                <p className="text-sm text-arc-text-secondary">Ethereum Sepolia Testnet</p>
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
            <div className="flex justify-between items-center p-3 bg-arc-dark-700 rounded-lg">
              <div>
                <p className="font-semibold">USDC (Arc)</p>
                <p className="text-sm text-arc-text-secondary">Arc Testnet</p>
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
            <div className="p-3 bg-arc-dark-700 rounded-lg text-center">
              <p className="text-arc-text-secondary text-sm mb-1">Sepolia → Arc</p>
              <p className="text-2xl font-bold text-green-400">{sepoliaToArcCount}</p>
            </div>
            <div className="p-3 bg-arc-dark-700 rounded-lg text-center">
              <p className="text-arc-text-secondary text-sm mb-1">Arc → Sepolia</p>
              <p className="text-2xl font-bold text-blue-400">{arcToSepoliaCount}</p>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-3 bg-arc-dark-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">
                        Bridge {tx.amount} USDC
                      </p>
                      <p className="text-arc-text-secondary text-xs">
                        {tx.fromNetwork} → {tx.toNetwork}
                      </p>
                      <p className="text-arc-text-secondary text-xs">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {tx.sourceTxHash && (
                        <a
                          href={
                            tx.fromNetwork === 'Sepolia'
                              ? `https://sepolia.etherscan.io/tx/${tx.sourceTxHash}`
                              : `https://testnet.arcscan.app/tx/${tx.sourceTxHash}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          View Tx
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-arc-text-secondary">
              <p>No recent transactions</p>
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}
