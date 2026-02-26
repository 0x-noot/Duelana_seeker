import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { colors, fontFamily, spacing, globalStyles } from '../theme';
import { PixelButton } from '../components/PixelButton';
import { BetAmountPicker, TokenType } from '../components/BetAmountPicker';
import { ScrollPanel } from '../components/ScrollPanel';
import { RSCloseButton } from '../components/RSCloseButton';
import { useWallet } from '../providers/WalletProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useDuelanaProgram } from '../hooks/useDuelanaProgram';
import { deriveDuelPDA, deriveEscrowPDA, deriveTokenEscrowPDA } from '../utils/pda';
import { solToLamports, tokenToSmallestUnit, truncateAddress } from '../utils/format';
import { SKR_MINT, SKR_DECIMALS, TOKEN_PROGRAM_ID } from '../utils/constants';
import { RootStackParamList } from '../navigation/RootNavigator';
import { tokenLogos } from '../assets';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateDuel'>;

// Associated Token Program ID
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export function CreateDuelScreen({ navigation }: Props) {
  const { publicKey, signAndSendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useDuelanaProgram();

  const [tokenType, setTokenType] = useState<TokenType>('SOL');
  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const feePercent = tokenType === 'SKR' ? 1 : 3;
  const feeMultiplier = 1 - feePercent / 100;
  const tokenLogo = tokenType === 'SKR' ? tokenLogos.skr : tokenLogos.sol;

  const handleCreate = useCallback(async () => {
    if (!publicKey || !betAmount) return;

    setLoading(true);
    try {
      const createdAt = Math.floor(Date.now() / 1000);
      const [duelPDA] = deriveDuelPDA(publicKey, createdAt);

      let tx;

      if (tokenType === 'SKR') {
        // SPL token duel
        const smallestUnits = tokenToSmallestUnit(betAmount, SKR_DECIMALS);
        const [tokenEscrowPDA] = deriveTokenEscrowPDA(duelPDA);
        const creatorATA = getAssociatedTokenAddress(SKR_MINT, publicKey);

        tx = await (program.methods as any)
          .createTokenDuel(new BN(smallestUnits), new BN(createdAt))
          .accounts({
            creator: publicKey,
            duel: duelPDA,
            tokenEscrow: tokenEscrowPDA,
            creatorTokenAccount: creatorATA,
            tokenMint: SKR_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
      } else {
        // Native SOL duel
        const lamports = solToLamports(betAmount);
        const [escrowPDA] = deriveEscrowPDA(duelPDA);

        tx = await (program.methods as any)
          .createDuel(new BN(lamports), new BN(createdAt))
          .accounts({
            creator: publicKey,
            duel: duelPDA,
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

      navigation.replace('WaitingForOpponent', {
        duelPubkey: duelPDA.toBase58(),
        betAmount,
        tokenType,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create duel');
    } finally {
      setLoading(false);
    }
  }, [
    publicKey,
    betAmount,
    tokenType,
    program,
    connection,
    signAndSendTransaction,
    navigation,
  ]);

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <RSCloseButton onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.content}>
        {/* Player info */}
        {publicKey && (
          <Text style={styles.playerAddress}>
            {truncateAddress(publicKey.toBase58(), 6)}
          </Text>
        )}

        <ScrollPanel variant="popup" style={{ padding: 0 }}>
          <View style={styles.panelInner}>
            {/* Your Stake section */}
            <Text style={styles.stakeLabel}>YOUR STAKE:</Text>
            <View style={styles.stakeDisplay}>
              <Image source={tokenLogo} style={styles.tokenLogo} resizeMode="contain" />
              <Text style={styles.stakeAmount}>
                {betAmount ? `${betAmount} ${tokenType}` : `-- ${tokenType}`}
              </Text>
            </View>

            {betAmount && (
              <Text style={styles.potText}>
                POT IF WON: {(betAmount * 2 * feeMultiplier).toFixed(tokenType === 'SKR' ? 2 : 4)} {tokenType}
              </Text>
            )}

            <View style={styles.separator} />

            {/* Token type selector */}
            <View style={styles.tokenSelector}>
              <View style={styles.tokenButtons}>
                <View style={{ opacity: tokenType === 'SOL' ? 0.4 : 1 }}>
                  <PixelButton
                    title="SOL"
                    onPress={() => { setTokenType('SOL'); setBetAmount(null); }}
                    disabled={loading}
                    small
                  />
                </View>
                <View style={{ opacity: tokenType === 'SKR' ? 0.4 : 1 }}>
                  <PixelButton
                    title="SKR"
                    onPress={() => { setTokenType('SKR'); setBetAmount(null); }}
                    disabled={loading}
                    small
                  />
                </View>
              </View>
              <Text style={styles.feeInfo}>
                {tokenType === 'SKR' ? 'SKR - 1% FEE' : 'SOL - 3% FEE'}
              </Text>
            </View>

            <BetAmountPicker
              onSelect={setBetAmount}
              disabled={loading}
              tokenType={tokenType}
            />
          </View>
        </ScrollPanel>

        <View style={styles.actions}>
          <PixelButton
            title={loading ? 'CREATING...' : 'CONFIRM & SIGN'}
            onPress={handleCreate}
            disabled={!betAmount || loading}
          />
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  playerAddress: {
    fontFamily,
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  panelInner: {
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    gap: spacing.md,
    alignItems: 'center',
  },
  stakeLabel: {
    fontFamily,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stakeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tokenLogo: {
    width: 32,
    height: 32,
  },
  stakeAmount: {
    fontFamily,
    fontSize: 20,
    color: colors.gold,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  potText: {
    fontFamily,
    fontSize: 11,
    color: colors.success,
    textAlign: 'center',
  },
  separator: {
    height: 2,
    backgroundColor: colors.textMuted,
    width: '100%',
    marginVertical: spacing.xs,
  },
  tokenSelector: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  tokenButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  feeInfo: {
    fontFamily,
    fontSize: 10,
    color: colors.success,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
