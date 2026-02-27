import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { colors, fontFamily, spacing } from '../theme';
import { PixelButton } from '../components/PixelButton';
import { ScrollPanel } from '../components/ScrollPanel';
import { useWallet } from '../providers/WalletProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useDuelanaProgram } from '../hooks/useDuelanaProgram';
import { useDuelSubscription } from '../hooks/useDuelSubscription';
import { deriveEscrowPDA, deriveTokenEscrowPDA } from '../utils/pda';
import { truncateAddress } from '../utils/format';
import { SKR_MINT, TOKEN_PROGRAM_ID } from '../utils/constants';
import { backgrounds } from '../assets';
import { RootStackParamList } from '../navigation/RootNavigator';

// Associated Token Program ID
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

type Props = NativeStackScreenProps<RootStackParamList, 'WaitingForOpponent'>;

export function WaitingForOpponentScreen({ navigation, route }: Props) {
  const { duelPubkey, betAmount, tokenType = 'SOL' } = route.params;
  const isToken = tokenType === 'SKR';
  const feeMultiplier = isToken ? 0.99 : 0.97;
  const { publicKey, signAndSendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useDuelanaProgram();

  const duelPk = useRef(new PublicKey(duelPubkey)).current;
  const { duel } = useDuelSubscription(duelPk);

  const [cancelling, setCancelling] = useState(false);
  const navigatedRef = useRef(false);

  // Animated dots for "WAITING FOR OPPONENT..."
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Auto-navigate to DuelAnimation when someone joins
  useEffect(() => {
    if (!duel || navigatedRef.current) return;

    const statusKey = Object.keys(duel.status)[0];
    // active, resolved, or claimed means duel was joined
    if (statusKey !== 'waiting' && statusKey !== 'cancelled') {
      navigatedRef.current = true;
      navigation.replace('DuelAnimation', { duelPubkey });
    }
  }, [duel, duelPubkey, navigation]);

  const handleCancel = useCallback(async () => {
    if (!publicKey) return;

    Alert.alert(
      'Cancel Duel',
      `Cancel this duel and reclaim your ${tokenType}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              let tx;

              if (isToken) {
                const [tokenEscrowPDA] = deriveTokenEscrowPDA(duelPk);
                const creatorATA = getAssociatedTokenAddress(SKR_MINT, publicKey);

                tx = await (program.methods as any)
                  .cancelTokenDuel()
                  .accounts({
                    creator: publicKey,
                    duel: duelPk,
                    tokenEscrow: tokenEscrowPDA,
                    creatorTokenAccount: creatorATA,
                    tokenMint: SKR_MINT,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                  })
                  .transaction();
              } else {
                const [escrowPDA] = deriveEscrowPDA(duelPk);

                tx = await program.methods
                  .cancelDuel()
                  .accounts({
                    creator: publicKey,
                    duel: duelPk,
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

              Alert.alert('Duel Cancelled', `Your ${tokenType} has been returned.`);
              navigation.replace('Home');
            } catch (err: any) {
              console.error('Cancel duel error:', err);
              Alert.alert('Cancel Failed', err?.message || 'Failed to cancel duel');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [publicKey, duelPk, program, connection, signAndSendTransaction, navigation, isToken, tokenType]);

  return (
    <ImageBackground
      source={backgrounds.duelArena}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollPanel variant="banner" style={styles.titleBanner}>
          <Text style={styles.title}>AWAITING CHALLENGER</Text>
        </ScrollPanel>

        <View style={styles.center}>
          <ScrollPanel variant="popup" style={{ padding: 0 }}>
            <View style={styles.detailsInner}>
              <Text style={styles.waitingText}>
                WAITING FOR{'\n'}OPPONENT{dots}
              </Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>WAGER</Text>
                <Text style={styles.value}>{betAmount} {tokenType}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>DUEL</Text>
                <Text style={styles.value}>
                  {truncateAddress(duelPubkey, 6)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>POTENTIAL WIN</Text>
                <Text style={styles.valueGreen}>
                  {(betAmount * 2 * feeMultiplier).toFixed(isToken ? 2 : 4)} {tokenType}
                </Text>
              </View>
            </View>
          </ScrollPanel>
        </View>

        <View style={styles.footer}>
          <PixelButton
            title={cancelling ? 'CANCELLING...' : 'CANCEL DUEL'}
            onPress={handleCancel}
            disabled={cancelling}
            small
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(26, 15, 8, 0.2)',
  },
  titleBanner: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  detailsInner: {
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 28,
    gap: spacing.md,
    alignItems: 'center',
  },
  waitingText: {
    fontFamily,
    fontSize: 16,
    color: colors.gold,
    textAlign: 'center',
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: {
    fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  value: {
    fontFamily,
    fontSize: 11,
    color: colors.text,
  },
  valueGreen: {
    fontFamily,
    fontSize: 11,
    color: colors.success,
  },
  footer: {
    paddingTop: spacing.md,
    alignItems: 'center',
  },
});
