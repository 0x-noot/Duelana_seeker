import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { DuelCard } from '../components/DuelCard';
import { PixelButton } from '../components/PixelButton';
import { ScrollPanel } from '../components/ScrollPanel';
import { RSCloseButton } from '../components/RSCloseButton';
import { useWallet } from '../providers/WalletProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useAllDuels, DuelAccount, isTokenDuel } from '../hooks/useDuelSubscription';
import { useDuelanaProgram } from '../hooks/useDuelanaProgram';
import { deriveEscrowPDA, deriveTokenEscrowPDA } from '../utils/pda';
import { VRF_ORACLE_QUEUE, VRF_PROGRAM_ID, SLOT_HASHES_SYSVAR, PROGRAM_ID, SKR_MINT, TOKEN_PROGRAM_ID, TREASURY } from '../utils/constants';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export function LobbyScreen({ navigation }: Props) {
  const { publicKey, signAndSendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useDuelanaProgram();
  const { duels, loading, refresh } = useAllDuels();
  const [joining, setJoining] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<PublicKey | null>(null);
  const cancelRunning = useRef(false);

  // Track the creator's own waiting duels to detect when they get joined
  const myWaitingDuelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!publicKey) return;

    // Get current set of my waiting duel pubkeys
    const currentMyDuels = new Set<string>();
    for (const { publicKey: duelPk, account } of duels) {
      if (account.creator.equals(publicKey)) {
        currentMyDuels.add(duelPk.toBase58());
      }
    }

    // Check if any of my previously-tracked duels disappeared from waiting list
    for (const prevDuelKey of myWaitingDuelsRef.current) {
      if (!currentMyDuels.has(prevDuelKey) && cancelling !== prevDuelKey) {
        // My duel disappeared and wasn't cancelled by me — it was joined!
        // Fetch the account to confirm it's now active
        const duelPk = new PublicKey(prevDuelKey);
        connection.getAccountInfo(duelPk, 'confirmed').then((info) => {
          if (!info) return;
          const data = new Uint8Array(info.data);
          // Status byte is at offset 114 in new 190-byte layout
          const statusByte = data[114];
          // 1=Active, 2=Resolved, 3=Claimed — any means duel was joined
          if (statusByte >= 1 && statusByte <= 3) {
            // Always show animation — it handles pre-resolved duels gracefully
            navigation.navigate('DuelAnimation', { duelPubkey: prevDuelKey });
          }
        }).catch(() => {});
      }
    }

    myWaitingDuelsRef.current = currentMyDuels;
  }, [duels, publicKey, cancelling, connection, navigation]);

  // Find duel account data for a given pubkey (needed for cancel to check token type)
  const findDuel = useCallback(
    (duelPubkey: PublicKey): DuelAccount | undefined => {
      return duels.find((d) => d.publicKey.equals(duelPubkey))?.account;
    },
    [duels],
  );

  // Execute cancel transaction when user confirms via Alert
  useEffect(() => {
    if (!pendingCancel || !publicKey || cancelRunning.current) return;
    cancelRunning.current = true;
    const duelPubkey = pendingCancel;

    (async () => {
      setCancelling(duelPubkey.toBase58());
      try {
        const duelData = findDuel(duelPubkey);
        const isToken = duelData && isTokenDuel(duelData);

        let tx;

        if (isToken) {
          // Token cancel
          const [tokenEscrowPDA] = deriveTokenEscrowPDA(duelPubkey);
          const creatorATA = getAssociatedTokenAddress(SKR_MINT, publicKey);

          tx = await (program.methods as any)
            .cancelTokenDuel()
            .accounts({
              creator: publicKey,
              duel: duelPubkey,
              tokenEscrow: tokenEscrowPDA,
              creatorTokenAccount: creatorATA,
              tokenMint: SKR_MINT,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .transaction();
        } else {
          // SOL cancel
          const [escrowPDA] = deriveEscrowPDA(duelPubkey);

          tx = await (program.methods as any)
            .cancelDuel()
            .accounts({
              creator: publicKey,
              duel: duelPubkey,
              escrow: escrowPDA,
              systemProgram: SystemProgram.programId,
            })
            .transaction();
        }

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        const signature = await signAndSendTransaction(tx);
        await connection.confirmTransaction(signature, 'confirmed');

        Alert.alert('Duel Cancelled', isToken ? 'Your SKR has been returned.' : 'Your SOL has been returned.');
        refresh();
      } catch (err: any) {
        console.error('Cancel duel error:', err);
        Alert.alert('Cancel Failed', err?.message || 'Failed to cancel duel');
      } finally {
        setCancelling(null);
        setPendingCancel(null);
        cancelRunning.current = false;
      }
    })();
  }, [pendingCancel, publicKey, program, connection, signAndSendTransaction, refresh, findDuel]);

  const handleCancel = useCallback(
    (duelPubkey: PublicKey) => {
      if (!publicKey) return;

      const duelData = findDuel(duelPubkey);
      const tokenLabel = duelData && isTokenDuel(duelData) ? 'SKR' : 'SOL';

      Alert.alert(
        'Cancel Duel',
        `Cancel this duel and reclaim your ${tokenLabel}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => setPendingCancel(duelPubkey),
          },
        ],
      );
    },
    [publicKey, findDuel],
  );

  const handleJoin = useCallback(
    async (duelPubkey: PublicKey) => {
      if (!publicKey) return;

      setJoining(duelPubkey.toBase58());
      try {
        const duelData = findDuel(duelPubkey);
        const isToken = duelData && isTokenDuel(duelData);

        // Derive the program identity PDA (used by #[vrf] macro for signing)
        const [programIdentity] = PublicKey.findProgramAddressSync(
          [Buffer.from('identity')],
          PROGRAM_ID,
        );

        let tx;

        if (isToken) {
          // Token join
          const [tokenEscrowPDA] = deriveTokenEscrowPDA(duelPubkey);
          const challengerATA = getAssociatedTokenAddress(SKR_MINT, publicKey);

          tx = await (program.methods as any)
            .joinTokenDuel()
            .accounts({
              challenger: publicKey,
              duel: duelPubkey,
              tokenEscrow: tokenEscrowPDA,
              challengerTokenAccount: challengerATA,
              tokenMint: SKR_MINT,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              oracleQueue: VRF_ORACLE_QUEUE,
              programIdentity,
              vrfProgram: VRF_PROGRAM_ID,
              slotHashes: SLOT_HASHES_SYSVAR,
            })
            .transaction();
        } else {
          // SOL join
          const [escrowPDA] = deriveEscrowPDA(duelPubkey);

          tx = await (program.methods as any)
            .joinDuel()
            .accounts({
              challenger: publicKey,
              duel: duelPubkey,
              escrow: escrowPDA,
              systemProgram: SystemProgram.programId,
              oracleQueue: VRF_ORACLE_QUEUE,
              programIdentity,
              vrfProgram: VRF_PROGRAM_ID,
              slotHashes: SLOT_HASHES_SYSVAR,
            })
            .transaction();
        }

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        const signature = await signAndSendTransaction(tx);

        await connection.confirmTransaction(signature, 'confirmed');

        // Navigate to animation screen
        navigation.navigate('DuelAnimation', {
          duelPubkey: duelPubkey.toBase58(),
        });
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to join duel');
      } finally {
        setJoining(null);
      }
    },
    [publicKey, program, connection, signAndSendTransaction, navigation, findDuel],
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <RSCloseButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollPanel variant="banner" style={styles.titleBanner}>
        <Text style={styles.title}>DUEL LOBBY</Text>
        <Text style={styles.subtitle}>
          {duels.length} DUEL{duels.length !== 1 ? 'S' : ''} AVAILABLE
        </Text>
      </ScrollPanel>

      <FlatList
        data={duels}
        keyExtractor={(item) => item.publicKey.toBase58()}
        renderItem={({ item }) => (
          <DuelCard
            publicKey={item.publicKey}
            duel={item.account}
            onJoin={handleJoin}
            onCancel={handleCancel}
            currentWallet={publicKey}
            cancelling={cancelling === item.publicKey.toBase58()}
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
            <Text style={styles.emptyText}>NO DUELS YET</Text>
            <Text style={styles.emptyHint}>BE THE FIRST TO CREATE ONE!</Text>
          </View>
        }
        contentContainerStyle={duels.length === 0 ? styles.emptyContainer : undefined}
        style={styles.list}
      />

      <View style={styles.footer}>
        <PixelButton
          title="CREATE DUEL"
          onPress={() => navigation.navigate('CreateDuel')}
          disabled={!publicKey}
        />
      </View>
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
    fontSize: 22,
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
    fontSize: 18,
    color: colors.textLight,
  },
  emptyHint: {
    fontFamily,
    fontSize: 13,
    color: colors.textLight,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
