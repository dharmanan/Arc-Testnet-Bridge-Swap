import { Connection, PublicKey } from '@solana/web3.js'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

export const SOLANA_DEVNET_NAME = 'Solana Devnet'
export const SOLANA_DEVNET_RPC_URL = import.meta.env.VITE_SOLANA_DEVNET_RPC?.trim() || 'https://api.devnet.solana.com'
export const SOLANA_DEVNET_DOMAIN_ID = 5
export const SOLANA_DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
export const SOLANA_DEVNET_GATEWAY_MINTER = new PublicKey('GATEmKK2ECL1brEngQZWCgMWPbvrEYqsV6u29dAaHavr')

export function createSolanaDevnetConnection() {
  return new Connection(SOLANA_DEVNET_RPC_URL, 'confirmed')
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `0x${hex}`
}

export function isValidSolanaAddress(address: string) {
  try {
    new PublicKey(address.trim())
    return true
  } catch {
    return false
  }
}

export function toSolanaBytes32Hex(publicKey: PublicKey | string) {
  const resolvedKey = typeof publicKey === 'string' ? new PublicKey(publicKey.trim()) : publicKey
  return bytesToHex(resolvedKey.toBytes())
}

export function deriveSolanaUsdcAta(ownerAddress: string) {
  const owner = new PublicKey(ownerAddress.trim())
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), SOLANA_DEVNET_USDC_MINT.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  return {
    owner,
    ata,
    ownerHex: toSolanaBytes32Hex(owner),
    ataHex: toSolanaBytes32Hex(ata),
  }
}

export async function fetchSolanaUsdcBalance(ownerAddress: string, connection = createSolanaDevnetConnection()) {
  const owner = new PublicKey(ownerAddress.trim())
  const response = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: SOLANA_DEVNET_USDC_MINT,
  })

  const totalBalance = response.value.reduce((runningTotal, accountInfo) => {
    const parsedInfo = (accountInfo.account.data as any)?.parsed?.info?.tokenAmount
    const uiAmountString = parsedInfo?.uiAmountString
    const uiAmount = typeof uiAmountString === 'string' ? Number.parseFloat(uiAmountString) : Number(parsedInfo?.uiAmount || 0)

    if (!Number.isFinite(uiAmount)) {
      return runningTotal
    }

    return runningTotal + uiAmount
  }, 0)

  return totalBalance.toFixed(6)
}