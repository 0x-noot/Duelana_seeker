import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  ImageBackground,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PublicKey } from '@solana/web3.js';
import { colors, fontFamily, spacing } from '../theme';
import { useDuelSubscription } from '../hooks/useDuelSubscription';
import { useConnection } from '../providers/ConnectionProvider';
import { useWallet } from '../providers/WalletProvider';
import { RootStackParamList } from '../navigation/RootNavigator';
import { backgrounds, fighters, ui, panels, buttons } from '../assets';
import { PixelButton } from '../components/PixelButton';
import { SpriteAnimator } from '../components/SpriteAnimator';
import { ScrollPanel } from '../components/ScrollPanel';
import { useScreenMusic, useAudioManager, useMuted, useToggleMute } from '../audio/useAudio';
import { AudioManager } from '../audio/AudioManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRITE_SIZE = 160;
const WALK_DISTANCE = SCREEN_HEIGHT * 0.2;
const VRF_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 4_000;

// Hitsplat / chunked HP constants
const MAX_HP = 99;
const WINNER_END_HP = 35;
const HIT_INTERVAL_MS = 800;
const HITSPLAT_VISIBLE_MS = 700;
const HITSPLAT_SIZE = 64;
const TOTAL_HITS = 16;

interface HitEvent {
  p1Damage: number; // damage dealt TO P1 (by P2)
  p2Damage: number; // damage dealt TO P2 (by P1)
}

type Props = NativeStackScreenProps<RootStackParamList, 'DuelAnimation'>;

type AnimPhase =
  | 'idle'
  | 'countdown'
  | 'walk'
  | 'clash'
  | 'fateDecides'
  | 'defeat'
  | 'ko'
  | 'navigate';

/**
 * Pre-generate all damage numbers for the fight.
 * Winner deals bigger hits (drains opponent from 99 to 0).
 * Loser deals smaller hits (drains opponent from 99 to ~35).
 */
function generateHitSequence(who: 'creator' | 'challenger'): HitEvent[] {
  const hits: HitEvent[] = [];
  const winnerTotalDmg = MAX_HP;
  const loserTotalDmg = MAX_HP - WINNER_END_HP;

  const winnerRaw: number[] = [];
  const loserRaw: number[] = [];

  for (let i = 0; i < TOTAL_HITS; i++) {
    winnerRaw.push(2 + Math.floor(Math.random() * 11)); // 2-12
    loserRaw.push(Math.floor(Math.random() * 9));        // 0-8
  }

  const winnerSum = winnerRaw.reduce((a, b) => a + b, 0);
  const loserSum = loserRaw.reduce((a, b) => a + b, 0) || 1; // avoid div by 0

  let winnerAccum = 0;
  let loserAccum = 0;

  for (let i = 0; i < TOTAL_HITS; i++) {
    let wDmg: number;
    let lDmg: number;

    if (i === TOTAL_HITS - 1) {
      wDmg = Math.max(0, winnerTotalDmg - winnerAccum);
      lDmg = Math.max(0, loserTotalDmg - loserAccum);
    } else {
      wDmg = Math.max(0, Math.round((winnerRaw[i] / winnerSum) * winnerTotalDmg));
      lDmg = Math.max(0, Math.round((loserRaw[i] / loserSum) * loserTotalDmg));
      wDmg = Math.min(wDmg, winnerTotalDmg - winnerAccum);
      lDmg = Math.min(lDmg, loserTotalDmg - loserAccum);
    }

    winnerAccum += wDmg;
    loserAccum += lDmg;

    if (who === 'creator') {
      // Creator is winner: P1 deals wDmg to P2, P2 deals lDmg to P1
      hits.push({ p1Damage: lDmg, p2Damage: wDmg });
    } else {
      // Challenger is winner: P2 deals wDmg to P1, P1 deals lDmg to P2
      hits.push({ p1Damage: wDmg, p2Damage: lDmg });
    }
  }

  return hits;
}

export function DuelAnimationScreen({ route, navigation }: Props) {
  const duelPubkey = new PublicKey(route.params.duelPubkey);
  const { duel } = useDuelSubscription(duelPubkey);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [winner, setWinner] = useState<'creator' | 'challenger' | null>(null);
  const [vrfTimedOut, setVrfTimedOut] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState<string | null>(null);
  const [p1Anim, setP1Anim] = useState<'idle' | 'walk' | 'attack'>('idle');
  const [p2Anim, setP2Anim] = useState<'idle' | 'walk' | 'attack'>('idle');

  useScreenMusic('battle');
  const audio = useAudioManager();
  const muted = useMuted();
  const toggleMute = useToggleMute();

  // Chunked HP state (integer values)
  const [p1Hp, setP1Hp] = useState(MAX_HP);
  const [p2Hp, setP2Hp] = useState(MAX_HP);

  // Hitsplat display state
  const [p1Hitsplat, setP1Hitsplat] = useState<number | null>(null);
  const [p2Hitsplat, setP2Hitsplat] = useState<number | null>(null);

  const winnerRevealed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Animated values
  const p1Y = useRef(new Animated.Value(0)).current;
  const p2Y = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const loserOpacity = useRef(new Animated.Value(1)).current;
  const p1HitsplatOpacity = useRef(new Animated.Value(0)).current;
  const p2HitsplatOpacity = useRef(new Animated.Value(0)).current;

  // Combat tick refs
  const hitSequence = useRef<HitEvent[] | null>(null);
  const hitIndex = useRef(0);
  const hitTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const combatStarted = useRef(false);

  // Frame arrays based on current animation state
  const p1Frames = useMemo(() => {
    switch (p1Anim) {
      case 'idle': return fighters.barbarian.idle;
      case 'walk': return fighters.barbarian.walkDown;
      case 'attack': return fighters.barbarian.attackDown;
    }
  }, [p1Anim]);

  const p2Frames = useMemo(() => {
    switch (p2Anim) {
      case 'idle': return fighters.berserker.idle;
      case 'walk': return fighters.berserker.walkUp;
      case 'attack': return fighters.berserker.attackUp;
    }
  }, [p2Anim]);

  // Helper to schedule a timeout and track it for cleanup
  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };

  // ---- Deliver a single hit (called by interval) ----

  const deliverHit = useCallback(() => {
    if (!hitSequence.current) return;
    if (hitIndex.current >= hitSequence.current.length) {
      if (hitTimer.current) {
        clearInterval(hitTimer.current);
        hitTimer.current = null;
      }
      return;
    }

    const hit = hitSequence.current[hitIndex.current];
    hitIndex.current += 1;

    // Play random battle hit sound
    audio.playBattleHit();

    // Update HP (clamped to 0)
    setP1Hp(prev => Math.max(0, prev - hit.p1Damage));
    setP2Hp(prev => Math.max(0, prev - hit.p2Damage));

    // Show hitsplat on P1
    setP1Hitsplat(hit.p1Damage);
    p1HitsplatOpacity.setValue(1);
    Animated.timing(p1HitsplatOpacity, {
      toValue: 0,
      duration: HITSPLAT_VISIBLE_MS,
      useNativeDriver: true,
    }).start(() => setP1Hitsplat(null));

    // Show hitsplat on P2
    setP2Hitsplat(hit.p2Damage);
    p2HitsplatOpacity.setValue(1);
    Animated.timing(p2HitsplatOpacity, {
      toValue: 0,
      duration: HITSPLAT_VISIBLE_MS,
      useNativeDriver: true,
    }).start(() => setP2Hitsplat(null));
  }, [p1HitsplatOpacity, p2HitsplatOpacity]);

  // ---- VRF Resolution ----

  // Watch for duel resolution from WebSocket subscription
  useEffect(() => {
    if (!duel) return;
    const statusKey = Object.keys(duel.status)[0];
    if (statusKey === 'resolved' || statusKey === 'claimed') {
      const isCreatorWinner = duel.winner.equals(duel.creator);
      setWinner(isCreatorWinner ? 'creator' : 'challenger');
    }
  }, [duel]);

  // Polling fallback
  useEffect(() => {
    if (winner) return;

    const pollInterval = setInterval(async () => {
      try {
        const info = await connection.getAccountInfo(duelPubkey, 'confirmed');
        if (!info) return;
        const data = new Uint8Array(info.data);
        const statusByte = data[80];
        if (statusByte === 2 || statusByte === 3) {
          const winnerPk = new PublicKey(data.slice(81, 113));
          const creatorPk = new PublicKey(data.slice(8, 40));
          setWinner(winnerPk.equals(creatorPk) ? 'creator' : 'challenger');
        }
      } catch {
        // polling failed, try again next interval
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [winner, duelPubkey, connection]);

  // VRF timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!winner) setVrfTimedOut(true);
    }, VRF_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [winner]);

  // ---- Main Animation Sequence ----

  useEffect(() => {
    // Phase: Idle (0-2s)
    setPhase('idle');
    setP1Anim('idle');
    setP2Anim('idle');

    // Phase: Countdown (2-5s)
    schedule(() => {
      setPhase('countdown');
      setCountdownNumber('3');
      audio.playCountdown(3);
    }, 2000);
    schedule(() => { setCountdownNumber('2'); audio.playCountdown(2); }, 3000);
    schedule(() => { setCountdownNumber('1'); audio.playCountdown(1); }, 4000);

    // Phase: Walk (5-9s)
    schedule(() => {
      setPhase('walk');
      setCountdownNumber('FIGHT!');
      setP1Anim('walk');
      setP2Anim('walk');

      Animated.parallel([
        Animated.timing(p1Y, {
          toValue: WALK_DISTANCE,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(p2Y, {
          toValue: -WALK_DISTANCE,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);

    // Clear countdown text
    schedule(() => setCountdownNumber(null), 5800);

    // Phase: Clash (9-17s)
    schedule(() => {
      setPhase('clash');
      setP1Anim('attack');
      setP2Anim('attack');
    }, 9000);

    // Impact flashes during clash (every 2.5s)
    [10500, 13000, 15500].forEach((t) => {
      schedule(() => {
        audio.playHeavyImpact();
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.6, duration: 80, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      }, t);
    });

    // Phase: Fate Decides (17-19s)
    schedule(() => {
      setPhase('fateDecides');
    }, 17000);

    return () => {
      timers.current.forEach(clearTimeout);
      if (hitTimer.current) clearInterval(hitTimer.current);
    };
  }, []);

  // ---- Combat Tick System: Hitsplats + Chunked HP ----

  useEffect(() => {
    if (!winner || combatStarted.current) return;
    const activePhases: AnimPhase[] = ['clash', 'fateDecides', 'defeat'];
    if (!activePhases.includes(phase)) return;

    combatStarted.current = true;
    hitSequence.current = generateHitSequence(winner);
    hitIndex.current = 0;

    // Deliver first hit immediately
    deliverHit();

    // Then every HIT_INTERVAL_MS
    hitTimer.current = setInterval(deliverHit, HIT_INTERVAL_MS);
  }, [winner, phase, deliverHit]);

  // Stop combat ticks during KO/navigate
  useEffect(() => {
    if (phase === 'ko' || phase === 'navigate') {
      if (hitTimer.current) {
        clearInterval(hitTimer.current);
        hitTimer.current = null;
      }
    }
  }, [phase]);

  // ---- HP-Reactive Defeat Sequence ----
  // Triggers when loser HP reaches 0 (synchronized with hit ticks)

  useEffect(() => {
    if (!winner) return;

    const loserHp = winner === 'creator' ? p2Hp : p1Hp;
    if (loserHp > 0) return;
    if (winnerRevealed.current) return;

    winnerRevealed.current = true;

    // Stop combat ticks immediately — no more hitsplats
    if (hitTimer.current) {
      clearInterval(hitTimer.current);
      hitTimer.current = null;
    }

    // Defeat phase after brief pause (500ms)
    // Both fighters go idle — winner stops attacking the dead opponent
    schedule(() => {
      setPhase('defeat');
      setP1Anim('idle');
      setP2Anim('idle');

      // Fade out loser
      Animated.timing(loserOpacity, {
        toValue: 0.15,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    }, 500);

    // K.O. phase (3s after HP=0)
    schedule(() => {
      setPhase('ko');
      AudioManager.stopMusic();

      // Flash sequence
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 3000);

    // Navigate to results (6s after HP=0)
    schedule(() => {
      setPhase('navigate');
      navigation.replace('Results', { duelPubkey: duelPubkey.toBase58() });
    }, 6000);
  }, [winner, p1Hp, p2Hp]);

  const getStatusText = () => {
    switch (phase) {
      case 'idle':
        return 'FIGHTERS READY...';
      case 'countdown':
      case 'walk':
        return '';
      case 'clash':
        return 'STEEL MEETS STEEL!';
      case 'fateDecides':
        return 'FATE DECIDES...';
      case 'defeat':
        return winner === 'creator' ? 'BARBARIAN WINS!' : 'BERSERKER WINS!';
      case 'ko':
        return '';
      default:
        return '';
    }
  };

  const p1IsLoser = winner === 'challenger';
  const p2IsLoser = winner === 'creator';

  return (
    <ImageBackground
      source={backgrounds.battlefield}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Mute toggle */}
        <Pressable style={[styles.muteButton, muted && { opacity: 0.4 }]} onPress={toggleMute}>
          <ImageBackground source={buttons.smallUp} style={styles.muteButtonBg} resizeMode="stretch">
            <Text style={styles.muteButtonText}>{'♫'}</Text>
          </ImageBackground>
        </Pressable>

        {/* Status text */}
        <Text style={styles.status}>{getStatusText()}</Text>

        {/* Arena — vertical layout */}
        <View style={styles.arena}>
          {/* P1 (Barbarian / Creator) — top, walks down */}
          <View style={styles.fighterSlot}>
            <Text style={styles.fighterLabel}>P1 - CREATOR</Text>
            <ImageBackground
              source={ui.healthBar}
              style={styles.healthBarBg}
              resizeMode="stretch"
            >
              <View
                style={[
                  styles.healthFill,
                  styles.healthFillP1,
                  { width: `${(p1Hp / MAX_HP) * 100}%` },
                ]}
              />
            </ImageBackground>
            <Animated.View
              style={[
                styles.spriteContainer,
                {
                  transform: [{ translateY: p1Y }],
                  opacity: p1IsLoser && (phase === 'defeat' || phase === 'ko')
                    ? loserOpacity
                    : 1,
                },
              ]}
            >
              <SpriteAnimator
                frames={p1Frames}
                frameDuration={p1Anim === 'walk' ? 180 : 220}
                playing={phase !== 'navigate'}
                imageStyle={styles.sprite}
              />
              {p1Hitsplat !== null && (
                <Animated.View style={[styles.hitsplatContainer, { opacity: p1HitsplatOpacity }]}>
                  <Image source={ui.hitsplat} style={styles.hitsplatImage} resizeMode="contain" />
                  <Text style={styles.hitsplatText}>{p1Hitsplat}</Text>
                </Animated.View>
              )}
            </Animated.View>
          </View>

          {/* Center zone — countdown, K.O. */}
          <View style={styles.centerZone}>
            {countdownNumber && (
              <Text style={styles.countdown}>{countdownNumber}</Text>
            )}
          </View>

          {/* P2 (Berserker / Challenger) — bottom, walks up */}
          <View style={styles.fighterSlot}>
            <Animated.View
              style={[
                styles.spriteContainer,
                {
                  transform: [{ translateY: p2Y }],
                  opacity: p2IsLoser && (phase === 'defeat' || phase === 'ko')
                    ? loserOpacity
                    : 1,
                },
              ]}
            >
              <SpriteAnimator
                frames={p2Frames}
                frameDuration={p2Anim === 'walk' ? 180 : 220}
                playing={phase !== 'navigate'}
                imageStyle={styles.sprite}
              />
              {p2Hitsplat !== null && (
                <Animated.View style={[styles.hitsplatContainer, { opacity: p2HitsplatOpacity }]}>
                  <Image source={ui.hitsplat} style={styles.hitsplatImage} resizeMode="contain" />
                  <Text style={styles.hitsplatText}>{p2Hitsplat}</Text>
                </Animated.View>
              )}
            </Animated.View>
            <ImageBackground
              source={ui.healthBar}
              style={styles.healthBarBg}
              resizeMode="stretch"
            >
              <View
                style={[
                  styles.healthFill,
                  styles.healthFillP2,
                  { width: `${(p2Hp / MAX_HP) * 100}%` },
                ]}
              />
            </ImageBackground>
            <Text style={styles.fighterLabel}>P2 - CHALLENGER</Text>
          </View>
        </View>

        {/* K.O. overlay — positioned above fighters */}
        {phase === 'ko' && (
          <View style={styles.koOverlay} pointerEvents="none">
            <ScrollPanel variant="banner" style={styles.koBanner}>
              <Text style={styles.koText}>K.O.!</Text>
            </ScrollPanel>
          </View>
        )}

        {/* Flash overlay */}
        <Animated.View
          style={[styles.flash, { opacity: flashOpacity }]}
          pointerEvents="none"
        />

        {/* VRF waiting indicator */}
        {(phase === 'fateDecides' || phase === 'clash') && !winner && !vrfTimedOut && (
          <Text style={styles.waiting}>AWAITING VRF...</Text>
        )}

        {/* VRF timeout fallback */}
        {vrfTimedOut && !winner && (
          <View style={styles.timeoutContainer}>
            <Text style={styles.timeoutText}>VRF IS TAKING LONGER THAN EXPECTED</Text>
            <PixelButton
              title="CHECK RESULTS"
              onPress={() => navigation.replace('Results', { duelPubkey: duelPubkey.toBase58() })}
              small
            />
            <PixelButton
              title="BACK TO LOBBY"
              onPress={() => navigation.replace('Lobby')}
              small
            />
          </View>
        )}
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
    backgroundColor: 'rgba(26, 15, 8, 0.4)',
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
  },
  status: {
    fontFamily,
    fontSize: 18,
    color: colors.gold,
    textAlign: 'center',
    minHeight: 24,
    textShadowColor: colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  arena: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  fighterSlot: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  fighterLabel: {
    fontFamily,
    fontSize: 13,
    color: colors.textLight,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  spriteContainer: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sprite: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  },
  healthBarBg: {
    width: SCREEN_WIDTH * 0.5,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  healthFill: {
    height: 10,
    borderRadius: 2,
  },
  healthFillP1: {
    backgroundColor: '#6b8e23',
  },
  healthFillP2: {
    backgroundColor: '#6b8e23',
  },
  centerZone: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdown: {
    fontFamily,
    fontSize: 50,
    color: colors.gold,
    textShadowColor: colors.black,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  koOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.12,
    zIndex: 10,
  },
  koBanner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  koText: {
    fontFamily,
    fontSize: 38,
    color: colors.danger,
    textShadowColor: colors.gold,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gold,
  },
  waiting: {
    fontFamily,
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  timeoutContainer: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timeoutText: {
    fontFamily,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  hitsplatContainer: {
    position: 'absolute',
    top: (SPRITE_SIZE - HITSPLAT_SIZE) / 2,
    left: (SPRITE_SIZE - HITSPLAT_SIZE) / 2,
    width: HITSPLAT_SIZE,
    height: HITSPLAT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  hitsplatImage: {
    width: HITSPLAT_SIZE,
    height: HITSPLAT_SIZE,
    position: 'absolute',
  },
  hitsplatText: {
    fontFamily,
    fontSize: 14,
    color: '#ffffff',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    zIndex: 11,
    textAlign: 'center',
  },
  muteButton: {
    position: 'absolute',
    top: spacing.xl + 16,
    right: spacing.md,
    width: 48,
    height: 44,
    zIndex: 100,
    elevation: 100,
  },
  muteButtonBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonText: {
    fontFamily,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
});
