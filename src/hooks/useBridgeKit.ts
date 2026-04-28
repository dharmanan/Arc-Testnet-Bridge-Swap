import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { type EIP1193Provider, createPublicClient, http, parseAbi } from 'viem';
import { ethers } from 'ethers';
import { ARC_EVM_CHAIN, ARC_EVM_CHAIN_ID, SEPOLIA_EVM_CHAIN, SEPOLIA_EVM_CHAIN_ID } from '../lib/chains';

export const SEPOLIA_CHAIN_ID = SEPOLIA_EVM_CHAIN_ID;
export const ARC_CHAIN_ID = ARC_EVM_CHAIN_ID;

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

// ERC20 ABI for balance reading
const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
]);

interface Eip1193RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

// Public clients for each chain with timeout
const createClientWithTimeout = (url: string) => {
  return createPublicClient({
    transport: http(url, {
      timeout: 3000, // 3 second timeout
      retryCount: 0, // No retries
    }),
  });
};

const publicClients: Record<number, any> = {
  [SEPOLIA_CHAIN_ID]: createClientWithTimeout(import.meta.env.VITE_SEPOLIA_RPC || SEPOLIA_EVM_CHAIN.rpcUrls.default.http[0]),
  [ARC_CHAIN_ID]: createClientWithTimeout(import.meta.env.VITE_ARC_TESTNET_RPC || ARC_EVM_CHAIN.rpcUrls.default.http[0]),
};

let bridgeKitInstance: BridgeKit | null = null;

export function useBridgeKit() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

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
  const getWalletProvider = useCallback(
    async (targetChainId: number) => {
      if (!walletClient || walletClient.chain.id !== targetChainId) {
        return null;
      }

      return new ethers.BrowserProvider(
        {
          request: async ({ method, params }: Eip1193RequestArguments) => {
            return walletClient.transport.request({ method, params } as never);
          },
        },
        {
          chainId: walletClient.chain.id,
          name: walletClient.chain.name,
          ensAddress: walletClient.chain.contracts?.ensRegistry?.address,
        },
      );
    },
    [walletClient],
  );

  const fetchTokenBalance = useCallback(
    async (token: BridgeToken, targetChainId: number) => {
      if (!address) {
        setTokenBalance('0');
        setBalanceError('');
        return;
      }

      setIsLoadingBalance(true);
      setBalanceError('');

      try {
        const tokenInfo = CHAIN_TOKENS[targetChainId]?.[token];
        if (!tokenInfo) {
          throw new Error(`Token ${token} not found on chain ${targetChainId}`);
        }

        console.log(`🔍 Fetching ${token} balance from ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]}...`);
        const walletProvider = await getWalletProvider(targetChainId);

        let balance: bigint;

        if (walletProvider) {
          const tokenContract = new ethers.Contract(
            tokenInfo.contractAddress,
            ['function balanceOf(address) view returns (uint256)'],
            walletProvider,
          );
          balance = await tokenContract.balanceOf(address);
        } else {
          const publicClient = publicClients[targetChainId];
          if (!publicClient) {
            throw new Error(`Public client not found for chain ${targetChainId}`);
          }

          balance = await publicClient.readContract({
            address: tokenInfo.contractAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });
        }

        const balanceFloat = Number(balance) / Math.pow(10, tokenInfo.decimals);
        setTokenBalance(balanceFloat.toFixed(6));
        console.log(`✅ Balance fetched for ${token} on chain ${targetChainId}: ${balanceFloat.toFixed(6)}`);
      } catch (err: any) {
        console.warn(`⚠️ Balance fetch failed for ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]}: ${err.message}`);
        setTokenBalance('0.000000');
        setBalanceError(`Failed to read ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]} ${token} balance. Refresh or switch to that network and try again.`);
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [address, getWalletProvider]
  );

  const getConnectedProvider = useCallback((): EIP1193Provider | null => {
    if (!walletClient) {
      return null;
    }

    return {
      request: async ({ method, params }: Eip1193RequestArguments) => {
        return walletClient.transport.request({ method, params } as never);
      },
    } as EIP1193Provider;
  }, [walletClient]);

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

        const provider = getConnectedProvider();
        if (!provider) {
          throw new Error('Connected wallet provider is not available. Reconnect your wallet and try again.');
        }

        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

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

        // Switch to source chain if needed and fail closed if the wallet stays on the wrong chain.
        if (chainId !== sourceChainId) {
          if (!switchChainAsync) {
            throw new Error(`Please switch your wallet to ${CHAIN_NAMES[sourceChainId]} before bridging.`);
          }

          setState(prev => ({ ...prev, step: 'switching-network' }));

          try {
            await switchChainAsync({ chainId: sourceChainId });
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (err: any) {
            throw new Error(
              err?.message?.includes('User rejected')
                ? `You rejected the switch to ${CHAIN_NAMES[sourceChainId]}.`
                : `Failed to switch your wallet to ${CHAIN_NAMES[sourceChainId]}.`
            );
          }
        }

        const activeChainHex = await provider.request({ method: 'eth_chainId' }) as string;
        const activeChainId = Number.parseInt(activeChainHex, 16);

        if (activeChainId !== sourceChainId) {
          throw new Error(`Wallet is still connected to the wrong chain. Switch to ${CHAIN_NAMES[sourceChainId]} and try again.`);
        }

        // Create adapter from the active wagmi wallet provider
        const adapter = await createAdapterFromProvider({
          provider,
        });

        // Execute bridge
        setState(prev => ({ ...prev, step: 'approving' }));
        console.log('🔄 Step changed to: approving');

        console.log(`🔄 Starting bridge transaction...`);
        console.log(`💰 Amount: ${amount} USDC`);

        // Execute bridge
        setState(prev => ({ ...prev, step: 'approving' }));

        const result = await bridgeKitInstance.bridge({
          from: {
            adapter: adapter,
            chain: sourceChain,
          },
          to: {
            adapter: adapter,
            chain: destinationChain,
          },
          amount: amount, // Bridge Kit expects string amount directly
        });

        console.log('✅ Bridge result:', result);

        // Update step to signing-bridge after approval
        setState(prev => ({ ...prev, step: 'signing-bridge' }));

        // Update step to waiting for receive confirmation
        setState(prev => ({ ...prev, step: 'waiting-receive-message' }));

        // Extract transaction hashes
        let sourceTxHash: string | undefined;
        let receiveTxHash: string | undefined;

        if (result && result.steps) {
          // steps[1] typically contains the burn/transfer tx
          if (result.steps[1]?.txHash) {
            sourceTxHash = result.steps[1].txHash;
          }

          if (result.steps[3]?.txHash) {
            receiveTxHash = result.steps[3].txHash;
          }
        }

        // Update step to waiting for receive confirmation
        setState(prev => ({ ...prev, step: 'waiting-receive-message' }));
        console.log('🔄 Step changed to: waiting-receive-message');

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

        // Refresh balances after bridge
        setTimeout(async () => {
          console.log('🔄 Refreshing balances after bridge...');
          
          const sourceChainId = direction === 'sepolia-to-arc' ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
          const destinationChainId = direction === 'sepolia-to-arc' ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;
          
          // Fetch both balances
          await fetchTokenBalance('USDC', sourceChainId);
          await fetchTokenBalance('USDC', destinationChainId);
          console.log('✅ Balances updated!');
        }, 1000); // Wait 1 second before refreshing
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
    [address, isConnected, chainId, switchChainAsync, fetchTokenBalance, getConnectedProvider]
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
