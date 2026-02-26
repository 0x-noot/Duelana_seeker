import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useConnection } from '../providers/ConnectionProvider';
import { PROGRAM_ID, DUEL_ACCOUNT_SIZE, ZERO_PUBKEY } from '../utils/constants';

export interface DuelAccount {
  creator: PublicKey;
  challenger: PublicKey;
  betAmount: BN;
  tokenMint: PublicKey;
  feeBps: number;
  status: Record<string, object>;
  winner: PublicKey;
  escrowBump: number;
  duelBump: number;
  createdAt: BN;
  vrfResult: number[] | null;
}

const STATUS_VARIANTS = ['waiting', 'active', 'resolved', 'claimed', 'cancelled'];

/**
 * Manually decode a Duel account from raw bytes.
 * Bypasses Anchor's BorshAccountsCoder which uses readUIntLE —
 * a method not available on Hermes/React Native's Uint8Array.
 *
 * Layout (190 bytes):
 *   0..8    discriminator
 *   8..40   creator (pubkey)
 *  40..72   challenger (pubkey)
 *  72..80   bet_amount (u64 LE)
 *  80..112  token_mint (pubkey)
 * 112..114  fee_bps (u16 LE)
 * 114..115  status (u8 enum index)
 * 115..147  winner (pubkey)
 * 147..148  escrow_bump (u8)
 * 148..149  duel_bump (u8)
 * 149..157  created_at (i64 LE)
 * 157..158  vrf_result option tag (0=None, 1=Some)
 * 158..190  vrf_result data ([u8;32]) if Some
 */
function decodeDuel(raw: Uint8Array): DuelAccount {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const creator = new PublicKey(raw.slice(8, 40));
  const challenger = new PublicKey(raw.slice(40, 72));

  // u64 little-endian: read as two u32 halves
  const betLow = view.getUint32(72, true);
  const betHigh = view.getUint32(76, true);
  const betAmount = new BN(betHigh).shln(32).add(new BN(betLow));

  const tokenMint = new PublicKey(raw.slice(80, 112));

  const feeBps = view.getUint16(112, true);

  const statusIndex = raw[114];
  const statusName = STATUS_VARIANTS[statusIndex] || 'waiting';
  const status: Record<string, object> = { [statusName]: {} };

  const winner = new PublicKey(raw.slice(115, 147));
  const escrowBump = raw[147];
  const duelBump = raw[148];

  // i64 little-endian
  const catLow = view.getUint32(149, true);
  const catHigh = view.getUint32(153, true);
  const createdAt = new BN(catHigh).shln(32).add(new BN(catLow));

  const vrfTag = raw[157];
  const vrfResult = vrfTag === 1 ? Array.from(raw.slice(158, 190)) : null;

  return {
    creator,
    challenger,
    betAmount,
    tokenMint,
    feeBps,
    status,
    winner,
    escrowBump,
    duelBump,
    createdAt,
    vrfResult,
  };
}

/** Check if a duel uses an SPL token (vs native SOL) */
export function isTokenDuel(duel: DuelAccount): boolean {
  return !duel.tokenMint.equals(ZERO_PUBKEY);
}

export function useDuelSubscription(duelPubkey?: PublicKey) {
  const { connection } = useConnection();
  const [duel, setDuel] = useState<DuelAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!duelPubkey) {
      setDuel(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDuel = async () => {
      try {
        const info = await connection.getAccountInfo(duelPubkey, 'confirmed');
        if (cancelled || !info) {
          if (!cancelled) setLoading(false);
          return;
        }
        setDuel(decodeDuel(new Uint8Array(info.data)));
      } catch {
        // fetch failed
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDuel();

    // WebSocket subscription (primary)
    const subscriptionId = connection.onAccountChange(
      duelPubkey,
      (accountInfo) => {
        if (cancelled) return;
        try {
          setDuel(decodeDuel(new Uint8Array(accountInfo.data)));
        } catch {
          setDuel(null);
        }
      },
      'confirmed',
    );

    // Polling fallback (every 4s) — devnet WebSocket is unreliable
    const pollInterval = setInterval(() => {
      if (!cancelled) fetchDuel();
    }, 4_000);

    return () => {
      cancelled = true;
      connection.removeAccountChangeListener(subscriptionId);
      clearInterval(pollInterval);
    };
  }, [duelPubkey, connection]);

  return { duel, loading };
}

export function useAllDuels() {
  const { connection } = useConnection();
  const [duels, setDuels] = useState<Array<{ publicKey: PublicKey; account: DuelAccount }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchDuels = useCallback(async () => {
    try {
      const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { dataSize: DUEL_ACCOUNT_SIZE },
        ],
      });

      const decoded: Array<{ publicKey: PublicKey; account: DuelAccount }> = [];
      for (const { pubkey, account } of rawAccounts) {
        try {
          const duel = decodeDuel(new Uint8Array(account.data));
          const statusKey = Object.keys(duel.status)[0];
          if (statusKey === 'waiting') {
            decoded.push({ publicKey: pubkey, account: duel });
          }
        } catch (e) {
          console.warn('Failed to decode duel account:', pubkey.toBase58(), e);
        }
      }

      setDuels(decoded);
    } catch (err) {
      console.error('Failed to fetch duels:', err);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchDuels();

    // WebSocket subscription (primary)
    const subscriptionId = connection.onProgramAccountChange(
      PROGRAM_ID,
      () => { fetchDuels(); },
      'confirmed',
    );

    // Polling fallback (every 5s) — devnet WebSocket is unreliable
    const pollInterval = setInterval(() => {
      fetchDuels();
    }, 5_000);

    return () => {
      connection.removeProgramAccountChangeListener(subscriptionId);
      clearInterval(pollInterval);
    };
  }, [connection, fetchDuels]);

  return { duels, loading, refresh: fetchDuels };
}

export interface HistoryStats {
  totalDuels: number;
  wins: number;
  losses: number;
  cancelled: number;
  winRate: string;
  netSol: number;   // in lamports (can be negative)
  netToken: number;  // in smallest token units (can be negative)
}

export function useHistoryDuels(userPublicKey: PublicKey | null) {
  const { connection } = useConnection();
  const [duels, setDuels] = useState<Array<{ publicKey: PublicKey; account: DuelAccount }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userPublicKey) {
      setDuels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: DUEL_ACCOUNT_SIZE }],
      });

      const historical: Array<{ publicKey: PublicKey; account: DuelAccount }> = [];
      for (const { pubkey, account } of rawAccounts) {
        try {
          const duel = decodeDuel(new Uint8Array(account.data));
          const statusKey = Object.keys(duel.status)[0];
          const isHistorical = ['resolved', 'claimed', 'cancelled'].includes(statusKey);
          const isParticipant =
            duel.creator.equals(userPublicKey) ||
            (!duel.challenger.equals(ZERO_PUBKEY) && duel.challenger.equals(userPublicKey));

          if (isHistorical && isParticipant) {
            historical.push({ publicKey: pubkey, account: duel });
          }
        } catch (e) {
          console.warn('Failed to decode duel account:', pubkey.toBase58(), e);
        }
      }

      // Sort by createdAt descending (newest first)
      historical.sort(
        (a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber(),
      );

      setDuels(historical);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [connection, userPublicKey]);

  useEffect(() => {
    fetchHistory();

    const subscriptionId = connection.onProgramAccountChange(
      PROGRAM_ID,
      () => { fetchHistory(); },
      'confirmed',
    );

    return () => {
      connection.removeProgramAccountChangeListener(subscriptionId);
    };
  }, [connection, fetchHistory]);

  const stats: HistoryStats = useMemo(() => {
    if (!userPublicKey) {
      return { totalDuels: 0, wins: 0, losses: 0, cancelled: 0, winRate: '0.0', netSol: 0, netToken: 0 };
    }

    let wins = 0;
    let losses = 0;
    let cancelled = 0;
    let netSol = 0;
    let netToken = 0;

    for (const { account: duel } of duels) {
      const statusKey = Object.keys(duel.status)[0];
      const betRaw = duel.betAmount.toNumber();
      const token = isTokenDuel(duel);

      if (statusKey === 'cancelled') {
        cancelled++;
        continue;
      }

      const isWinner = duel.winner.equals(userPublicKey);
      if (isWinner) {
        wins++;
        const totalPot = betRaw * 2;
        const fee = Math.floor((totalPot * duel.feeBps) / 10_000);
        const profit = totalPot - fee - betRaw;
        if (token) { netToken += profit; } else { netSol += profit; }
      } else {
        losses++;
        if (token) { netToken -= betRaw; } else { netSol -= betRaw; }
      }
    }

    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    return { totalDuels: duels.length, wins, losses, cancelled, winRate, netSol, netToken };
  }, [duels, userPublicKey]);

  return { duels, stats, loading, refresh: fetchHistory };
}
