import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './constants';

const DUEL_SEED = Buffer.from('duel');
const ESCROW_SEED = Buffer.from('escrow');
const TOKEN_ESCROW_SEED = Buffer.from('token_escrow');

export function deriveDuelPDA(
  creator: PublicKey,
  createdAt: bigint | number,
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(createdAt));
  return PublicKey.findProgramAddressSync(
    [DUEL_SEED, creator.toBuffer(), buf],
    PROGRAM_ID,
  );
}

export function deriveEscrowPDA(duelPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_SEED, duelPubkey.toBuffer()],
    PROGRAM_ID,
  );
}

export function deriveTokenEscrowPDA(duelPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TOKEN_ESCROW_SEED, duelPubkey.toBuffer()],
    PROGRAM_ID,
  );
}
