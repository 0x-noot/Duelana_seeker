import React, { useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import AnimatedBackground from '../components/AnimatedBackground';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, spacing } from '../theme';
import { PixelButton } from '../components/PixelButton';
import { ScrollPanel } from '../components/ScrollPanel';
import { RSCloseButton } from '../components/RSCloseButton';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { useWallet } from '../providers/WalletProvider';
import { RootStackParamList } from '../navigation/RootNavigator';
import { backgrounds, buttons, homeBackgroundFrames } from '../assets';
import { useScreenMusic, useMuted, useToggleMute } from '../audio/useAudio';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { connected } = useWallet();
  const [showInfo, setShowInfo] = useState(false);
  useScreenMusic('home');
  const muted = useMuted();
  const toggleMute = useToggleMute();

  return (
    <>
    <AnimatedBackground
      frames={homeBackgroundFrames}
      frameDuration={200}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconButton} onPress={() => setShowInfo(true)}>
              <ImageBackground source={buttons.smallUp} style={styles.iconButtonBg} resizeMode="stretch">
                <Text style={styles.iconButtonText}>?</Text>
              </ImageBackground>
            </Pressable>
            <Pressable style={[styles.iconButton, muted && { opacity: 0.4 }]} onPress={toggleMute}>
              <ImageBackground source={buttons.smallUp} style={styles.iconButtonBg} resizeMode="stretch">
                <Text style={styles.iconButtonText}>{'♫'}</Text>
              </ImageBackground>
            </Pressable>
          </View>
          <WalletConnectButton />
        </View>

        <View style={styles.center}>
          <View style={styles.buttons}>
            <PixelButton
              title="CREATE DUEL"
              onPress={() => navigation.navigate('CreateDuel')}
              disabled={!connected}
            />
            <PixelButton
              title="VIEW DUELS"
              onPress={() => navigation.navigate('Lobby')}
            />
            <PixelButton
              title="HISTORY"
              onPress={() => navigation.navigate('History')}
              small
            />
          </View>

          {!connected && (
            <Text style={styles.hint}>CONNECT WALLET TO PLAY</Text>
          )}
        </View>
      </View>
    </AnimatedBackground>

    <Modal
      visible={showInfo}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInfo(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <ScrollPanel variant="popup" style={{ padding: 0 }}>
            <View style={styles.modalInner}>
              <RSCloseButton onPress={() => setShowInfo(false)} style={styles.modalCloseButton} />
              <Text style={styles.modalTitle}>HOW IT WORKS</Text>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionHeader}>1. FAIR 50/50 ODDS</Text>
                <Text style={styles.sectionBody}>
                  Every duel is a coinflip with exactly 50/50 odds. No house edge beyond the protocol fee.
                </Text>

                <Text style={styles.sectionHeader}>2. PROTOCOL FEE</Text>
                <Text style={styles.sectionBody}>
                  SOL duels: 3% fee. SKR token duels: only 1% fee. The fee is taken from the total pot and sent to the Duelana treasury. The rest goes to the winner.
                </Text>

                <Text style={styles.sectionHeader}>3. SOL & SKR WAGERING</Text>
                <Text style={styles.sectionBody}>
                  Wager with native SOL or SKR tokens. Choose your token when creating a duel. SKR duels have a lower 1% fee.
                </Text>

                <Text style={styles.sectionHeader}>4. PROVABLY FAIR</Text>
                <Text style={styles.sectionBody}>
                  Results are determined on-chain using MagicBlock VRF (Verifiable Random Function). Every outcome is transparent and verifiable.
                </Text>

                <Text style={styles.sectionHeader}>5. CREATE A DUEL</Text>
                <Text style={styles.sectionBody}>
                  Tap "Create Duel", choose SOL or SKR, pick your wager amount, sign the transaction, and wait for an opponent.
                </Text>

                <Text style={styles.sectionHeader}>6. CANCEL ANYTIME</Text>
                <Text style={styles.sectionBody}>
                  Taking too long to find an opponent? Cancel your duel anytime to get your full wager back.
                </Text>

                <Text style={styles.sectionHeader}>7. JOIN A DUEL</Text>
                <Text style={styles.sectionBody}>
                  Tap "View Duels" to browse open duels and join one that matches your desired wager amount.
                </Text>

                <Text style={styles.sectionHeader}>8. HISTORY</Text>
                <Text style={styles.sectionBody}>
                  The History tab tracks all your past duels, your win/loss record, and net P&L.
                </Text>

                <Text style={styles.sectionHeader}>9. CLAIM WINNINGS</Text>
                <Text style={styles.sectionBody}>
                  After the duel animation plays out, the winner must tap "Claim" on the results screen to receive the pot.
                </Text>
              </ScrollView>

            </View>
          </ScrollPanel>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(26, 15, 8, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 48,
    height: 44,
  },
  iconButtonBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontFamily,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: 40,
  },
  buttons: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  hint: {
    fontFamily,
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.md,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 15, 8, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
  },
  modalInner: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 20,
  },
  modalCloseButton: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    zIndex: 10,
  },
  modalTitle: {
    fontFamily,
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  modalScroll: {
    maxHeight: 400,
  },
  sectionHeader: {
    fontFamily,
    fontSize: 12,
    color: colors.black,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  sectionBody: {
    fontFamily,
    fontSize: 10,
    color: colors.black,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
});
