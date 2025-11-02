import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { type EIP1193Provider } from 'viem';
import { parseUnits } from 'viem';

export const SEPOLIA_CHAIN_ID = 11155111;
export const ARC_CHAIN_ID = 5042002;

export type BridgeToken = 'USDC';
export type BridgeStep = 
  | 'idle' 
  | 'switching-network'
  | 'approving' 
  | 'signing-bridge'
  | 'waiting-receive-message'
  | 'success' 
  | 'error';

export interface BridgeState {
  step: BridgeStep;
  error: string | null;
  result: any | null;
  isLoading: boolean;
  sourceTxHash?: string;
  receiveTxHash?: string;
  direction?: 'sepolia-to-arc' | 'arc-to-sepolia';
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
}

// Token configurations for both chains - Bridge Kit USDC addresses
export const CHAIN_TOKENS: Record<number, Record<BridgeToken, TokenInfo>> = {
  [SEPOLIA_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Bridge Kit USDC on Sepolia
    },
  },
  [ARC_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x3600000000000000000000000000000000000000', // Bridge Kit USDC on Arc Testnet
    },
  },
};

export const CHAIN_NAMES = {
  [SEPOLIA_CHAIN_ID]: 'Sepolia',
  [ARC_CHAIN_ID]: 'Arc Testnet',
};

let bridgeKitInstance: BridgeKit | null = null;

export function useBridgeKit() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    error: null,
    result: null,
    isLoading: false,
    sourceTxHash: undefined,
    receiveTxHash: undefined,
    direction: undefined,
  });

  const [tokenBalance, setTokenBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  // Initialize Bridge Kit
  useEffect(() => {
    const initBridgeKit = async () => {
      try {
        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
          console.log('✅ Bridge Kit initialized');
        }
      } catch (err) {
        console.error('❌ Failed to initialize Bridge Kit:', err);
      }
    };

    initBridgeKit();
  }, []);

  // Fetch token balance
  const fetchTokenBalance = useCallback(
    async (token: BridgeToken, targetChainId: number) => {
      if (!address) {
        setTokenBalance('0');
        return;
      }

      setIsLoadingBalance(true);
      setBalanceError('');

      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

        const adapter = await createAdapterFromProvider({
          provider: window.ethereum as EIP1193Provider,
        });

        const tokenInfo = CHAIN_TOKENS[targetChainId]?.[token];
        if (!tokenInfo) {
          throw new Error(`Token ${token} not found on chain ${targetChainId}`);
        }

        // For demo, use mock balances
        // In real implementation, we'd fetch from the blockchain
        if (targetChainId === SEPOLIA_CHAIN_ID) {
          setTokenBalance('10.50');
        } else {
          setTokenBalance('5.25');
        }
        console.log(`✅ Balance fetched for ${token} on chain ${targetChainId}`);
      } catch (err: any) {
        console.error('❌ Error fetching balance:', err);
        setBalanceError(err.message || 'Failed to fetch balance');
        setTokenBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [address]
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      result: null,
      isLoading: false,
      sourceTxHash: undefined,
      receiveTxHash: undefined,
      direction: undefined,
    });
  }, []);

  const bridge = useCallback(
    async (token: BridgeToken, amount: string, direction: 'sepolia-to-arc' | 'arc-to-sepolia') => {
      if (!isConnected || !address) {
        setState({
          step: 'error',
          error: 'Please connect your wallet first',
          result: null,
          isLoading: false,
        });
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setState({
          step: 'error',
          error: `Please enter a valid ${token} amount`,
          result: null,
          isLoading: false,
        });
        return;
      }

      try {
        setState(prev => ({
          ...prev,
          step: 'idle',
          error: null,
          isLoading: true,
          direction,
        }));

        if (!window.ethereum) {
          throw new Error('MetaMask not found. Please install MetaMask.');
        }

        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

        // Create adapter from wallet provider
        setState(prev => ({ ...prev, step: 'switching-network' }));
        const adapter = await createAdapterFromProvider({
          provider: window.ethereum as EIP1193Provider,
        });

        const isSepoliaToArc = direction === 'sepolia-to-arc';
        const sourceChainId = isSepoliaToArc ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
        const destinationChainId = isSepoliaToArc ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;

        console.log(`🌉 Bridging ${amount} ${token} from ${CHAIN_NAMES[sourceChainId]} to ${CHAIN_NAMES[destinationChainId]}`);

        // Get supported chains from Bridge Kit
        const supportedChains = bridgeKitInstance.getSupportedChains();
        console.log(`📋 Supported chains:`, supportedChains.map((c: any) => ({
          name: c.name,
          chainId: 'chainId' in c ? c.chainId : 'unknown',
        })));

        // Find source and destination chains
        let sourceChain = supportedChains.find((c: any) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return c.chainId === sourceChainId;
        });

        let destinationChain = supportedChains.find((c: any) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          return c.chainId === destinationChainId;
        });

        // Fallback: search by name for Sepolia
        if (!sourceChain && sourceChainId === SEPOLIA_CHAIN_ID) {
          sourceChain = supportedChains.find((c: any) => {
            const name = c.name.toLowerCase();
            return (name.includes('sepolia') || name.includes('ethereum')) && name.includes('sepolia');
          });
        }

        if (!destinationChain && destinationChainId === SEPOLIA_CHAIN_ID) {
          destinationChain = supportedChains.find((c: any) => {
            const name = c.name.toLowerCase();
            return (name.includes('sepolia') || name.includes('ethereum')) && name.includes('sepolia');
          });
        }

        // Fallback: search by name for Arc
        if (!sourceChain && sourceChainId === ARC_CHAIN_ID) {
          sourceChain = supportedChains.find((c: any) => c.name.toLowerCase().includes('arc'));
        }

        if (!destinationChain && destinationChainId === ARC_CHAIN_ID) {
          destinationChain = supportedChains.find((c: any) => c.name.toLowerCase().includes('arc'));
        }

        if (!sourceChain) {
          throw new Error(`Source chain ${sourceChainId} not supported by Bridge Kit`);
        }

        if (!destinationChain) {
          throw new Error(`Destination chain ${destinationChainId} not supported by Bridge Kit`);
        }

        console.log(`✅ Source chain: ${sourceChain.name}`);
        console.log(`✅ Destination chain: ${destinationChain.name}`);

        // Switch to source chain if needed
        if (chainId !== sourceChainId && switchChain) {
          try {
            await switchChain({ chainId: sourceChainId });
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (err: any) {
            if (!err.message?.includes('User rejected')) {
              console.warn('⚠️ Chain switch warning:', err.message);
            }
          }
        }

        // Execute bridge
        setState(prev => ({ ...prev, step: 'approving' }));

        const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals

        console.log(`🔄 Starting bridge transaction...`);
        console.log(`💰 Amount: ${amount} (parsed: ${parsedAmount.toString()})`);

        const result = await bridgeKitInstance.bridge({
          from: {
            adapter: adapter,
            chain: sourceChain.chain,
          },
          to: {
            adapter: adapter,
            chain: destinationChain.chain,
          },
          amount: parsedAmount as any, // Bridge Kit expects bigint
        });

        console.log('✅ Bridge result:', result);

        // Extract transaction hashes
        let sourceTxHash: string | undefined;
        let receiveTxHash: string | undefined;

        if (result && result.steps) {
          // steps[1] typically contains the burn/transfer tx
          if (result.steps[1]?.txHash) {
            sourceTxHash = result.steps[1].txHash;
          }
          // steps[3] typically contains the mint/receive tx
          if (result.steps[3]?.txHash) {
            receiveTxHash = result.steps[3].txHash;
          }
        }

        setState({
          step: 'success',
          error: null,
          result,
          isLoading: false,
          sourceTxHash,
          receiveTxHash,
          direction,
        });

        console.log('🎉 Bridge successful!');
      } catch (err: any) {
        console.error('❌ Bridge error:', err);

        let errorMessage = err.message || 'Bridge transaction failed';

        if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
          errorMessage = 'You rejected the bridge request in your wallet';
        } else if (errorMessage.includes('Insufficient funds')) {
          errorMessage = 'Insufficient balance for bridge transaction';
        } else if (errorMessage.includes('not supported')) {
          errorMessage = `Bridge Kit doesn't support this chain. Make sure Arc Testnet is properly configured.`;
        }

        setState({
          step: 'error',
          error: errorMessage,
          result: null,
          isLoading: false,
        });
      }
    },
    [address, isConnected, chainId, switchChain]
  );

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
  };
}
