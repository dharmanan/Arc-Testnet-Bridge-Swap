import { useState, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';

export const SEPOLIA_CHAIN_ID = 11155111;
export const ARC_CHAIN_ID = 5042002;

export type BridgeToken = 'USDC';
export type BridgeStep = 'idle' | 'switching-network' | 'approving' | 'signing' | 'waiting' | 'success' | 'error';

export interface BridgeState {
  step: BridgeStep;
  error: string | null;
  result: any;
  isLoading: boolean;
  sourceTxHash: string | null;
  receiveTxHash: string | null;
  direction: 'sepolia-to-arc' | 'arc-to-sepolia' | null;
}

export const CHAIN_TOKENS = {
  [SEPOLIA_CHAIN_ID]: {
    USDC: {
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
    },
  },
  [ARC_CHAIN_ID]: {
    USDC: {
      contractAddress: '0x3600000000000000000000000000000000000000',
      decimals: 6,
    },
  },
} as const;

export const CHAIN_NAMES = {
  [SEPOLIA_CHAIN_ID]: 'Sepolia',
  [ARC_CHAIN_ID]: 'Arc Testnet',
};

export function useBridgeKit() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    error: null,
    result: null,
    isLoading: false,
    sourceTxHash: null,
    receiveTxHash: null,
    direction: null,
  });

  const [tokenBalance, setTokenBalance] = useState('0.00');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchTokenBalance = useCallback(
    async (token: BridgeToken, targetChainId: number) => {
      if (!address) {
        setTokenBalance('0.00');
        return;
      }

      setIsLoadingBalance(true);
      setBalanceError(null);

      try {
        const tokenConfig = (CHAIN_TOKENS as any)[targetChainId]?.[token];

        if (!tokenConfig) {
          throw new Error(`Token ${token} not found on chain ${targetChainId}`);
        }

        // Mock balance - in real implementation, this would fetch from blockchain
        if (targetChainId === SEPOLIA_CHAIN_ID) {
          setTokenBalance('1500.00');
        } else {
          setTokenBalance('500.00');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Balance fetch failed';
        setBalanceError(message);
        setTokenBalance('0.00');
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [address]
  );

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      result: null,
      isLoading: false,
      sourceTxHash: null,
      receiveTxHash: null,
      direction: null,
    });
  }, []);

  const bridge = useCallback(
    async (token: BridgeToken, amount: string, direction: 'sepolia-to-arc' | 'arc-to-sepolia') => {
      if (!address) {
        setState(prev => ({
          ...prev,
          error: 'Wallet not connected',
          step: 'error',
        }));
        return;
      }

      const sourceChainId = direction === 'sepolia-to-arc' ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
      const destChainId = direction === 'sepolia-to-arc' ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;

      setState(prev => ({
        ...prev,
        step: 'switching-network',
        isLoading: true,
        direction,
        error: null,
      }));

      try {
        if (chainId !== sourceChainId) {
          await switchChain({ chainId: sourceChainId });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setState(prev => ({
          ...prev,
          step: 'approving',
        }));

        await new Promise(resolve => setTimeout(resolve, 1000));

        setState(prev => ({
          ...prev,
          step: 'signing',
        }));

        await new Promise(resolve => setTimeout(resolve, 1500));

        setState(prev => ({
          ...prev,
          step: 'waiting',
        }));

        const mockSourceTx = '0x' + Array(64)
          .fill(0)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join('');

        setState(prev => ({
          ...prev,
          sourceTxHash: mockSourceTx,
        }));

        await new Promise(resolve => setTimeout(resolve, 3000));

        const mockReceiveTx = '0x' + Array(64)
          .fill(0)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join('');

        setState(prev => ({
          ...prev,
          step: 'success',
          isLoading: false,
          sourceTxHash: mockSourceTx,
          receiveTxHash: mockReceiveTx,
          result: {
            amount,
            token,
            sourceChain: CHAIN_NAMES[sourceChainId as keyof typeof CHAIN_NAMES],
            destChain: CHAIN_NAMES[destChainId as keyof typeof CHAIN_NAMES],
          },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Bridge failed';
        setState(prev => ({
          ...prev,
          step: 'error',
          error: message,
          isLoading: false,
        }));
      }
    },
    [address, chainId, switchChain]
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
