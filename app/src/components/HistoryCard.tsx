import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { DuelAccount, isTokenDuel } from '../hooks/useDuelSubscription';
import { truncateAddress, formatSol, formatToken } from '../utils/format';
import { SKR_DECIMALS } from '../utils/constants';
import { colors, fontFamily, spacing } from '../theme';
import { ScrollPanel } from './ScrollPanel';
import { PixelButton } from './PixelButton';

interface Props {
  publicKey: PublicKey;
  duel: DuelAccount;
  userPublicKey: PublicKey;
  onPress: (duelPubkey: string) => void;
  onClaim?: (duelPubkey: string) => void;
  claiming?: boolean;
}

export function HistoryCard({ publicKey, duel, userPublicKey, onPress, onClaim, claiming }: Props) {
  const statusKey = Object.keys(duel.status)[0];
  const betRaw = duel.betAmount?.toNumber?.() ?? 0;
  const isWinner = duel.winner.equals(userPublicKey);
  const isCreator = duel.creator.equals(userPublicKey);
  const isToken = isTokenDuel(duel);
  const tokenSymbol = isToken ? 'SKR' : 'SOL';
  const fmt = (amount: number) =>
    isToken ? formatToken(amount, SKR_DECIMALS) : formatSol(amount);

  // Opponent address
  const opponent = isCreator ? duel.challenger : duel.creator;
  const opponentStr = truncateAddress(opponent.toBase58());

  // Date from createdAt timestamp
  const date = new Date(duel.createdAt.toNumber() * 1000);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Unclaimed win: resolved but not yet claimed
  const isUnclaimed = statusKey === 'resolved' && isWinner;

  // Result info
  let resultLabel: string;
  let resultColor: string;
  let amountStr: string;

  if (statusKey === 'cancelled') {
    resultLabel = 'CANCELLED';
    resultColor = colors.textMuted;
    amountStr = `${fmt(betRaw)} ${tokenSymbol}`;
  } else if (isWinner) {
    resultLabel = 'WON';
    resultColor = colors.success;
    const totalPot = betRaw * 2;
    const fee = Math.floor((totalPot * duel.feeBps) / 10_000);
    const profit = totalPot - fee - betRaw;
    amountStr = `+${fmt(profit)} ${tokenSymbol}`;
  } else {
    resultLabel = 'LOST';
    resultColor = colors.danger;
    amountStr = `-${fmt(betRaw)} ${tokenSymbol}`;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(publicKey.toBase58())}
      activeOpacity={0.7}
    >
      <ScrollPanel variant="card" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.date}>{dateStr}</Text>
            <Text style={styles.opponent}>
              {statusKey === 'cancelled' ? 'NO CHALLENGER' : `VS ${opponentStr}`}
            </Text>
            <Text style={styles.bet}>{fmt(betRaw)} {tokenSymbol} BET</Text>
          </View>

          <View style={styles.result}>
            <Text style={[styles.resultBadge, { color: resultColor, borderColor: resultColor }]}>
              {resultLabel}
            </Text>
            <Text style={[styles.amount, { color: resultColor }]}>
              {amountStr}
            </Text>
            {isUnclaimed && onClaim && (
              <PixelButton
                title={claiming ? '...' : 'CLAIM!'}
                onPress={() => onClaim(publicKey.toBase58())}
                disabled={claiming}
                small
              />
            )}
          </View>
        </View>
      </ScrollPanel>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  date: {
    fontFamily,
    fontSize: 10,
    color: colors.textMuted,
  },
  opponent: {
    fontFamily,
    fontSize: 11,
    color: colors.text,
  },
  bet: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
  },
  result: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  resultBadge: {
    fontFamily,
    fontSize: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  amount: {
    fontFamily,
    fontSize: 13,
  },
});
