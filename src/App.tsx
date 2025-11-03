import { useState, useEffect, useRef } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { SwapTab } from './components/SwapTab'
import { BridgeTab } from './components/BridgeTab'
import { DashboardTab } from './components/DashboardTab'
import { Container } from './components/ui'
import { Zap, GitBranch, BarChart3, Twitter, Github, ChevronDown } from 'lucide-react'
import arcLogo from './assets/arc.png'
import './index.css'

type Tab = 'swap' | 'bridge' | 'dashboard'

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [activeTab, setActiveTab] = useState<Tab>('swap')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [showLendingDropdown, setShowLendingDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lendingDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNetworkDropdown(false)
      }
      if (lendingDropdownRef.current && !lendingDropdownRef.current.contains(event.target as Node)) {
        setShowLendingDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'swap', label: 'Swap', icon: <Zap size={20} /> },
    { id: 'bridge', label: 'Bridge', icon: <GitBranch size={20} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={20} /> },
  ]

  const getNetworkName = (chainId: number | undefined) => {
    switch (chainId) {
      case 11155111: return 'Sepolia'
      case 5042002: return 'Arc Testnet'
      default: return 'Unknown Network'
    }
  }

  const networks = [
    { id: 11155111, name: 'Sepolia' },
    { id: 5042002, name: 'Arc Testnet' },
  ]

  const handleNetworkSwitch = (networkId: number) => {
    if (switchChain) {
      switchChain({ chainId: networkId })
    }
    setShowNetworkDropdown(false)
  }

  return (
    <div className="min-h-screen bg-arc-dark-900 text-arc-text-primary">
      {/* Header */}
      <header className="border-b border-arc-dark-700 sticky top-0 z-50 bg-arc-dark-900/80 backdrop-blur-lg">
        <Container className="py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={arcLogo} alt="Arc Logo" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold" style={{
              color: '#00ff88',
              textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88'
            }}>Arc Bridge</h1>
          </div>
          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-arc-dark-800 hover:bg-arc-dark-700 rounded-lg text-sm transition-colors"
                >
                  <span>Network: {getNetworkName(chainId)}</span>
                  <ChevronDown size={14} className={`transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showNetworkDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-arc-dark-800 border border-arc-dark-700 rounded-lg shadow-lg z-50 min-w-[140px]">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkSwitch(network.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-arc-dark-700 transition-colors ${
                          chainId === network.id ? 'text-arc-accent-primary' : 'text-arc-text-primary'
                        }`}
                      >
                        {network.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ConnectButton chainStatus="none" />
          </div>
        </Container>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-arc-dark-700 bg-arc-dark-900/50 sticky top-16 z-40">
        <Container>
          <nav className="flex gap-8 py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="relative" ref={lendingDropdownRef}>
              <button
                onClick={() => setShowLendingDropdown(!showLendingDropdown)}
                className="flex items-center gap-2 pb-2 border-b-2 border-transparent text-dark-400 hover:text-white transition-colors"
              >
                Lending
                <ChevronDown size={14} className={`transition-transform ${showLendingDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLendingDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-arc-dark-800 border border-arc-dark-700 rounded-lg shadow-lg z-50 min-w-[140px]">
                  <a
                    href="https://arclending.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-dark-700 transition-colors"
                    onClick={() => setShowLendingDropdown(false)}
                  >
                    Arc Lending
                  </a>
                </div>
              )}
            </div>
          </nav>
        </Container>
      </div>

      {/* Content */}
      <main>
        {activeTab === 'swap' && <SwapTab />}
        {activeTab === 'bridge' && <BridgeTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-arc-dark-700 py-8 mt-12">
        <Container>
          <div className="text-center text-dark-400 text-sm">
            <p>Sepolia Testnet • Arc Testnet</p>
            <div className="mt-4 p-4 bg-arc-dark-800/50 rounded-lg border border-arc-dark-700">
              <p className="font-semibold text-arc-accent-primary mb-2">MVP Testnet Application - Educational v1 for ARC Protocol</p>
              <p>This is a testnet demo application for learning and testing ARC Protocol features. Not for production use. All transactions use test tokens with no real value.</p>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <a
                href="https://docs.arc.network/arc/concepts/welcome-to-arc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark-400 hover:text-blue-400 transition-colors"
                title="Arc Protocol Documentation"
              >
                <span className="text-xs">ARC Docs</span>
              </a>
              <a
                href="https://x.com/KohenEric"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark-400 hover:text-blue-400 transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://github.com/dharmanan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark-400 hover:text-blue-400 transition-colors"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
