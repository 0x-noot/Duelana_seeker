import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, spacing, globalStyles } from '../theme';
import { HistoryCard } from '../components/HistoryCard';
import { ScrollPanel } from '../components/ScrollPanel';
import { RSCloseButton } from '../components/RSCloseButton';
import { useWallet } from '../providers/WalletProvider';
import { useHistoryDuels } from '../hooks/useDuelSubscription';
import { formatSol, formatToken } from '../utils/format';
import { SKR_DECIMALS } from '../utils/constants';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { publicKey } = useWallet();
  const { duels, stats, loading, refresh } = useHistoryDuels(publicKey);

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
