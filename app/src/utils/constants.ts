import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('3gE3AwSm9yVYCTSXHFiqWShzoU5vGjwTXJRL7WLz6vNv');
export const TREASURY = new PublicKey('6uT7LVyYWZS37pC2cv4FtMeMT9ScnivjukxfxFgbgEPY');

// MagicBlock VRF oracle queue (devnet)
export const VRF_ORACLE_QUEUE = new PublicKey('Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh');

// MagicBlock VRF program
export const VRF_PROGRAM_ID = new PublicKey('Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz');

// SlotHashes sysvar
export const SLOT_HASHES_SYSVAR = new PublicKey('SysvarS1otHashes111111111111111111111111111');

// SPL Token Program
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export const FEE_BASIS_POINTS = 300; // 3% (native SOL)

// SKR token configuration
export const SKR_MINT = new PublicKey('9DdqwXM6BRWLdMesSf2fBWp9ZgeoJ2Qbr8rVKnyGAW2T');
export const SKR_DECIMALS = 6;
export const SKR_FEE_BASIS_POINTS = 100; // 1%
export const SKR_BET_PRESETS = [100, 250, 500, 750, 1000]; // in SKR tokens

export const CLUSTER = 'devnet';
export const RPC_URL = process.env.HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : 'https://api.devnet.solana.com';

export const SOL_BET_PRESETS = [0.05, 0.1, 0.25, 0.5, 1.0]; // in SOL
export const BET_PRESETS = SOL_BET_PRESETS; // backward compat alias

export const LAMPORTS_PER_SOL = 1_000_000_000;

// Duel account data size (8 discriminator + 182 data = 190 bytes)
export const DUEL_ACCOUNT_SIZE = 190;

// Zero pubkey for comparison (native SOL duels have token_mint = default)
export const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));
