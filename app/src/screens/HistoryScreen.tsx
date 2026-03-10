import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { colors, fontFamily, spacing, globalStyles } from '../theme';
import { HistoryCard } from '../components/HistoryCard';
import { ScrollPanel } from '../components/ScrollPanel';
import { RSCloseButton } from '../components/RSCloseButton';
import { useWallet } from '../providers/WalletProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useHistoryDuels, isTokenDuel } from '../hooks/useDuelSubscription';
import { useDuelanaProgram } from '../hooks/useDuelanaProgram';
import { deriveEscrowPDA, deriveTokenEscrowPDA } from '../utils/pda';
import { formatSol, formatToken } from '../utils/format';
import { SKR_DECIMALS, TREASURY, SKR_MINT, TOKEN_PROGRAM_ID } from '../utils/constants';
import { RootStackParamList } from '../navigation/RootNavigator';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { publicKey, signAndSendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useDuelanaProgram();
  const { duels, stats, loading, refresh } = useHistoryDuels(publicKey);
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const handleClaim = useCallback(async (duelPubkeyStr: string) => {
    if (!publicKey || !program) return;
    const duelPubkey = new PublicKey(duelPubkeyStr);
    const duelEntry = duels.find(d => d.publicKey.toBase58() === duelPubkeyStr);
    if (!duelEntry) return;
    const isToken = isTokenDuel(duelEntry.account);

    setClaiming(prev => ({ ...prev, [duelPubkeyStr]: true }));
    try {
      let tx;
      if (isToken) {
        const [tokenEscrowPDA] = deriveTokenEscrowPDA(duelPubkey);
        const winnerATA = getAssociatedTokenAddress(SKR_MINT, publicKey);
        const treasuryATA = getAssociatedTokenAddress(SKR_MINT, TREASURY);
        tx = await (program.methods as any)
          .claimTokenWinnings()
          .accounts({
            winner: publicKey,
            duel: duelPubkey,
            tokenEscrow: tokenEscrowPDA,
            winnerTokenAccount: winnerATA,
            treasury: TREASURY,
            treasuryTokenAccount: treasuryATA,
            tokenMint: SKR_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction();
      } else {
        const [escrowPDA] = deriveEscrowPDA(duelPubkey);
        tx = await (program.methods as any)
          .claimWinnings()
          .accounts({
            winner: publicKey,
            duel: duelPubkey,
            escrow: escrowPDA,
            treasury: TREASURY,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
      }

      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signature = await signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, 'confirmed');

      Alert.alert('CLAIMED!', 'Winnings sent to your wallet.');
      refresh();
    } catch (err: any) {
      console.error('Claim error from history:', err);
      const msg = err?.error?.errorMessage || err?.message || 'Failed to claim winnings';
      Alert.alert('Claim Failed', msg);
    } finally {
      setClaiming(prev => ({ ...prev, [duelPubkeyStr]: false }));
    }
  }, [publicKey, program, connection, signAndSendTransaction, duels, refresh]);

  const solColor = stats.netSol >= 0 ? colors.success : colors.danger;
  const solPrefix = stats.netSol >= 0 ? '+' : '-';
  const solDisplay = `${solPrefix}${formatSol(Math.abs(stats.netSol))} SOL`;
  const tokenColor = stats.netToken >= 0 ? colors.success : colors.danger;
  const tokenPrefix = stats.netToken >= 0 ? '+' : '-';
  const tokenDisplay = `${tokenPrefix}${formatToken(Math.abs(stats.netToken), SKR_DECIMALS)} SKR`;

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <RSCloseButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollPanel variant="banner" style={styles.titleBanner}>
        <Text style={styles.title}>DUEL HISTORY</Text>
        {publicKey && stats.totalDuels > 0 ? (
          <>
            <Text style={styles.statsLine}>
              {stats.wins}W - {stats.losses}L ({stats.winRate}%)
            </Text>
            {stats.netSol !== 0 && (
              <Text style={[styles.statsLine, { color: solColor }]}>
                NET: {solDisplay}
              </Text>
            )}
            {stats.netToken !== 0 && (
              <Text style={[styles.statsLine, { color: tokenColor }]}>
                NET: {tokenDisplay}
              </Text>
            )}
            {stats.netSol === 0 && stats.netToken === 0 && (
              <Text style={styles.statsLine}>NET: EVEN</Text>
            )}
          </>
        ) : (
          <Text style={styles.subtitle}>
            {publicKey ? '0 DUELS' : 'CONNECT WALLET'}
          </Text>
        )}
      </ScrollPanel>

      <FlatList
        data={duels}
        keyExtractor={(item) => item.publicKey.toBase58()}
        renderItem={({ item }) => (
          <HistoryCard
            publicKey={item.publicKey}
            duel={item.account}
            userPublicKey={publicKey!}
            onPress={(duelPubkey) =>
              navigation.navigate('Results', { duelPubkey })
            }
            onClaim={handleClaim}
            claiming={claiming[item.publicKey.toBase58()]}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.secondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {publicKey ? 'NO DUEL HISTORY YET' : 'CONNECT WALLET TO VIEW'}
            </Text>
            {publicKey && (
              <Text style={styles.emptyHint}>CREATE YOUR FIRST DUEL!</Text>
            )}
          </View>
        }
        contentContainerStyle={duels.length === 0 ? styles.emptyContainer : undefined}
        style={styles.list}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginBottom: spacing.sm,
  },
  titleBanner: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statsLine: {
    fontFamily,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  list: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyHint: {
    fontFamily,
    fontSize: 13,
    color: colors.textLight,
  },
});
