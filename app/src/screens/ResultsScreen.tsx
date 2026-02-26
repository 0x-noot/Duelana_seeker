import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { colors, fontFamily, spacing, globalStyles } from '../theme';
import { PixelButton } from '../components/PixelButton';
import { ScrollPanel } from '../components/ScrollPanel';
import { useWallet } from '../providers/WalletProvider';
import { useConnection } from '../providers/ConnectionProvider';
import { useDuelSubscription, isTokenDuel } from '../hooks/useDuelSubscription';
import { useDuelanaProgram } from '../hooks/useDuelanaProgram';
import { deriveEscrowPDA, deriveTokenEscrowPDA } from '../utils/pda';
import { formatSol, formatToken, truncateAddress } from '../utils/format';
import { TREASURY, SKR_MINT, SKR_DECIMALS, TOKEN_PROGRAM_ID } from '../utils/constants';
import { RootStackParamList } from '../navigation/RootNavigator';
import { fighters, tokenLogos } from '../assets';
import { AudioManager } from '../audio/AudioManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export function ResultsScreen({ route, navigation }: Props) {
  const duelPubkey = new PublicKey(route.params.duelPubkey);
  const { duel } = useDuelSubscription(duelPubkey);
  const { publicKey, signAndSendTransaction } = useWallet();
  const { connection } = useConnection();
  const program = useDuelanaProgram();
  const [claiming, setClaiming] = useState(false);
  const resultVOPlayed = useRef(false);

  const isResolved = duel && ('resolved' in duel.status || 'claimed' in duel.status);
  const isWinner =
    duel && publicKey && isResolved && duel.winner.equals(publicKey);

  // Play win/lose voice over once when result is known
  useEffect(() => {
    if (isResolved && publicKey && !resultVOPlayed.current) {
      resultVOPlayed.current = true;
      AudioManager.playResult(!!isWinner);
    }
  }, [isResolved, publicKey, isWinner]);
  const isClaimed = duel && duel.status && 'claimed' in duel.status;
  const canGoHome = !isWinner || isClaimed; // losers can leave; winners must claim first

  const isToken = duel ? isTokenDuel(duel) : false;
  const tokenSymbol = isToken ? 'SKR' : 'SOL';
  const feeBps = duel?.feeBps ?? 300;
  const feePercent = feeBps / 100;

  const betAmountRaw = duel?.betAmount?.toNumber?.() ?? 0;
  const totalPot = betAmountRaw * 2;
  const fee = Math.floor((totalPot * feeBps) / 10_000);
  const payout = totalPot - fee;

  const formatAmount = (amount: number) =>
    isToken ? formatToken(amount, SKR_DECIMALS) : formatSol(amount);

  // Determine characters based on role
  const isCreator = duel && publicKey ? duel.creator.equals(publicKey) : true;
  const myChar = isCreator ? fighters.barbarian.idle[0] : fighters.berserker.idle[0];
  const opponentChar = isCreator ? fighters.berserker.idle[0] : fighters.barbarian.idle[0];
  const opponentAddress = duel
    ? isCreator
      ? duel.challenger.toBase58()
      : duel.creator.toBase58()
    : '';

  const tokenLogo = isToken ? tokenLogos.skr : tokenLogos.sol;

  const handleClaim = useCallback(async () => {
    if (!publicKey || !duel) return;

    setClaiming(true);
    try {
      let tx;

      if (isToken) {
        // Token claim
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
        // SOL claim
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
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const signature = await signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, 'confirmed');

      Alert.alert('VICTORY!', `Claimed ${formatAmount(payout)} ${tokenSymbol}!`);
    } catch (err: any) {
      console.error('Claim winnings error:', JSON.stringify(err, null, 2));
      const code = err?.error?.errorCode?.code || err?.code;
      const msg = err?.error?.errorMessage || err?.message || 'Failed to claim winnings';
      Alert.alert('Claim Failed', `${msg}${code ? ` (Code: ${code})` : ''}\n\nPlease try again.`);
    } finally {
      setClaiming(false);
    }
  }, [publicKey, duel, duelPubkey, program, connection, signAndSendTransaction, payout, isToken, tokenSymbol, formatAmount]);

  if (!duel) {
    return (
      <View style={[globalStyles.container, styles.center]}>
        <Text style={styles.loading}>LOADING...</Text>
      </View>
    );
  }

  if (!isResolved) {
    return (
      <View style={[globalStyles.container, styles.center]}>
        <Text style={styles.loading}>AWAITING VRF RESULT...</Text>
        <Text style={styles.vrfHint}>The duel is being resolved on-chain.</Text>
        <PixelButton
          title="BACK TO HOME"
          onPress={() => navigation.navigate('Home')}
          small
        />
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, styles.center]}>
      {/* Result header */}
      <Text style={isWinner ? styles.winTitle : styles.loseTitle}>
        {isWinner ? 'YOU WON!' : 'YOU LOST!'}
      </Text>

      {/* RS-style two-column layout on parchment */}
      <ScrollPanel variant="popup" style={styles.parchment}>
        <View style={styles.detailsInner}>
          <View style={styles.columns}>
            {/* Left column: The Spoils / Your Loss */}
            <View style={styles.column}>
              <Text style={styles.columnHeader}>
                {isWinner ? 'The Spoils:' : 'Your Loss:'}
              </Text>
              <Image source={myChar} style={styles.characterImage} resizeMode="contain" />
              <View style={styles.amountRow}>
                <Image source={tokenLogo} style={styles.tokenLogoSmall} resizeMode="contain" />
                <Text style={[styles.amountText, { color: isWinner ? colors.success : colors.danger }]}>
                  {isWinner ? formatAmount(payout) : formatAmount(betAmountRaw)}
                </Text>
              </View>
            </View>

            {/* Right column: The Defeated / The Victor */}
            <View style={styles.column}>
              <Text style={styles.columnHeader}>
                {isWinner ? 'The Defeated:' : 'The Victor:'}
              </Text>
              <Image source={opponentChar} style={styles.characterImage} resizeMode="contain" />
              <Text style={styles.opponentAddress}>
                {truncateAddress(opponentAddress, 4)}
              </Text>
            </View>
          </View>

          {/* Fee info */}
          <View style={styles.feeSection}>
            <View style={styles.separator} />
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>FEE ({feePercent}%)</Text>
              <Text style={styles.feeValue}>-{formatAmount(fee)} {tokenSymbol}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>TOTAL POT</Text>
              <Text style={styles.feeValue}>{formatAmount(totalPot)} {tokenSymbol}</Text>
            </View>
          </View>
        </View>
      </ScrollPanel>

      {/* Actions */}
      <View style={styles.actions}>
        {isWinner && !isClaimed && (
          <PixelButton
            title={claiming ? 'CLAIMING...' : 'CLAIM!'}
            onPress={handleClaim}
            disabled={claiming}
          />
        )}

        {isClaimed && (
          <Text style={styles.claimedText}>WINNINGS CLAIMED!</Text>
        )}

        {isWinner && !isClaimed && (
          <Text style={styles.claimHint}>CLAIM YOUR WINNINGS FIRST!</Text>
        )}

        <PixelButton
          title="BACK TO HOME"
          onPress={() => navigation.navigate('Home')}
          disabled={!canGoHome}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loading: {
    fontFamily,
    fontSize: 16,
    color: colors.textLight,
  },
  winTitle: {
    fontFamily,
    fontSize: 28,
    color: colors.gold,
    textShadowColor: colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  loseTitle: {
    fontFamily,
    fontSize: 28,
    color: colors.danger,
    textShadowColor: colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  parchment: {
    width: '100%',
    alignSelf: 'center',
    padding: 0,
  },
  detailsInner: {
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: spacing.md,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  columnHeader: {
    fontFamily,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
  },
  characterImage: {
    width: 100,
    height: 100,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenLogoSmall: {
    width: 24,
    height: 24,
  },
  amountText: {
    fontFamily,
    fontSize: 13,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  opponentAddress: {
    fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
  feeSection: {
    gap: spacing.xs,
  },
  separator: {
    height: 2,
    backgroundColor: colors.textMuted,
    marginBottom: spacing.xs,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontFamily,
    fontSize: 9,
    color: colors.textMuted,
  },
  feeValue: {
    fontFamily,
    fontSize: 9,
    color: colors.text,
  },
  actions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  claimedText: {
    fontFamily,
    fontSize: 16,
    color: colors.success,
    textAlign: 'center',
  },
  claimHint: {
    fontFamily,
    fontSize: 12,
    color: colors.success,
    textAlign: 'center',
  },
  vrfHint: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
