import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { DuelAccount, isTokenDuel } from '../hooks/useDuelSubscription';
import { truncateAddress, formatSol, formatToken } from '../utils/format';
import { SKR_DECIMALS } from '../utils/constants';
import { colors, fontFamily, spacing } from '../theme';
import { PixelButton } from './PixelButton';
import { ScrollPanel } from './ScrollPanel';

interface Props {
  publicKey: PublicKey;
  duel: DuelAccount;
  onJoin: (duelPubkey: PublicKey) => void;
  onCancel: (duelPubkey: PublicKey) => void;
  currentWallet: PublicKey | null;
  cancelling?: boolean;
}

export function DuelCard({ publicKey, duel, onJoin, onCancel, currentWallet, cancelling }: Props) {
  const betAmountRaw = duel.betAmount?.toNumber?.() ?? 0;
  const isCreator =
    currentWallet && duel.creator.equals(currentWallet);
  const isToken = isTokenDuel(duel);
  const tokenSymbol = isToken ? 'SKR' : 'SOL';
  const betDisplay = isToken
    ? formatToken(betAmountRaw, SKR_DECIMALS)
    : formatSol(betAmountRaw);
  return (
    <ScrollPanel variant="card" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.creator}>
            {isCreator ? 'YOUR DUEL' : truncateAddress(duel.creator.toBase58())}
          </Text>
          <Text style={styles.bet}>{betDisplay} {tokenSymbol}</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusBadge}>{tokenSymbol}</Text>
        </View>

        {isCreator ? (
          <PixelButton
            title={cancelling ? '...' : 'CANCEL'}
            onPress={() => onCancel(publicKey)}
            disabled={cancelling}
            small
          />
        ) : (
          <PixelButton
            title="JOIN"
            onPress={() => onJoin(publicKey)}
            disabled={!currentWallet}
            small
          />
        )}
      </View>
    </ScrollPanel>
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
  creator: {
    fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  bet: {
    fontFamily,
    fontSize: 16,
    color: colors.text,
  },
  statusContainer: {
    marginHorizontal: spacing.sm,
  },
  statusBadge: {
    fontFamily,
    fontSize: 10,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
});
