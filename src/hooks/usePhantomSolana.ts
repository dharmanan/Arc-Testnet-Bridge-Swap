import { useCallback, useEffect, useState } from 'react'

const PROVIDER_NOT_FOUND_ERROR = 'Phantom Solana provider was not detected in this browser session.'

function resolvePhantomSolanaProvider(): PhantomSolanaProvider | null {
  if (typeof window === 'undefined') {
    return null
  }

  const provider = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined)
  return provider?.isPhantom ? provider : null
}

function toBase58Address(publicKey?: PhantomSolanaPublicKey | null) {
  if (!publicKey) {
    return null
  }

  if (typeof publicKey.toBase58 === 'function') {
    return publicKey.toBase58()
  }

  if (typeof publicKey.toString === 'function') {
    return publicKey.toString()
  }

  return null
}

function subscribeToProviderEvent(
  provider: PhantomSolanaProvider,
  event: 'connect' | 'disconnect' | 'accountChanged',
  listener: (publicKey?: PhantomSolanaPublicKey | null) => void,
) {
  provider.on?.(event, listener)

  return () => {
    if (provider.off) {
      provider.off(event, listener)
      return
    }

    provider.removeListener?.(event, listener)
  }
}

export function usePhantomSolana() {
  const [provider, setProvider] = useState<PhantomSolanaProvider | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncProvider = useCallback(() => {
    const nextProvider = resolvePhantomSolanaProvider()
    setProvider(nextProvider)
    setAddress(toBase58Address(nextProvider?.publicKey))
    return nextProvider
  }, [])

  useEffect(() => {
    const nextProvider = syncProvider()

    if (!nextProvider) {
      return undefined
    }

    const handleConnect = (publicKey?: PhantomSolanaPublicKey | null) => {
      setAddress(toBase58Address(publicKey ?? nextProvider.publicKey))
      setError(null)
    }

    const handleDisconnect = () => {
      setAddress(null)
    }

    const handleAccountChanged = (publicKey?: PhantomSolanaPublicKey | null) => {
      setAddress(toBase58Address(publicKey ?? nextProvider.publicKey))
      setError(null)
    }

    const unsubscribeConnect = subscribeToProviderEvent(nextProvider, 'connect', handleConnect)
    const unsubscribeDisconnect = subscribeToProviderEvent(nextProvider, 'disconnect', handleDisconnect)
    const unsubscribeAccountChanged = subscribeToProviderEvent(nextProvider, 'accountChanged', handleAccountChanged)

    window.addEventListener('focus', syncProvider)

    return () => {
      unsubscribeConnect()
      unsubscribeDisconnect()
      unsubscribeAccountChanged()
      window.removeEventListener('focus', syncProvider)
    }
  }, [syncProvider])

  const connect = useCallback(async () => {
    const nextProvider = resolvePhantomSolanaProvider()

    if (!nextProvider) {
      setProvider(null)
      setAddress(null)
      setError(PROVIDER_NOT_FOUND_ERROR)
      throw new Error(PROVIDER_NOT_FOUND_ERROR)
    }

    setProvider(nextProvider)
    setIsConnecting(true)
    setError(null)

    try {
      const response = await nextProvider.connect()
      const nextAddress = toBase58Address(response?.publicKey ?? nextProvider.publicKey)
      setAddress(nextAddress)
      return nextAddress
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : 'Could not connect Phantom on Solana.'
      setError(message)
      throw connectError
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!provider) {
      return
    }

    try {
      await provider.disconnect()
      setAddress(null)
      setError(null)
    } catch (disconnectError) {
      const message = disconnectError instanceof Error ? disconnectError.message : 'Could not disconnect Phantom on Solana.'
      setError(message)
      throw disconnectError
    }
  }, [provider])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return {
    address,
    connect,
    disconnect,
    error,
    isConnected: Boolean(address),
    isConnecting,
    isPhantomInstalled: Boolean(provider),
    provider,
    resetError,
  }
}