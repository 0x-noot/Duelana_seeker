import { Audio, AVPlaybackStatus } from 'expo-av';
import { music, battleSounds, voiceOvers, uiSounds } from './audioAssets';

type MusicTrack = keyof typeof music;
type MuteListener = (muted: boolean) => void;

class AudioManagerClass {
  private currentMusic: Audio.Sound | null = null;
  private currentMusicTrack: MusicTrack | null = null;
  private musicVolume = 0.4;
  private sfxVolume = 0.8;
  private muted = false;
  private muteListeners: MuteListener[] = [];

  async init(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }

  // ---- Mute ----

  isMuted(): boolean {
    return this.muted;
  }

  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    if (muted) {
      await this.stopMusic();
    }
    this.muteListeners.forEach(fn => fn(muted));
  }

  async toggleMute(): Promise<void> {
    await this.setMuted(!this.muted);
  }

  onMuteChange(listener: MuteListener): () => void {
    this.muteListeners.push(listener);
    return () => {
      this.muteListeners = this.muteListeners.filter(fn => fn !== listener);
    };
  }

  // ---- Music ----

  async playMusic(track: MusicTrack): Promise<void> {
    if (this.muted) return;
    if (this.currentMusicTrack === track && this.currentMusic) return;
    await this.stopMusic();
    try {
      const { sound } = await Audio.Sound.createAsync(music[track], {
        isLooping: true,
        volume: this.musicVolume,
        shouldPlay: true,
      });
      this.currentMusic = sound;
      this.currentMusicTrack = track;
    } catch (e) {
      console.warn('AudioManager: Failed to play music', track, e);
    }
  }

  async stopMusic(): Promise<void> {
    if (this.currentMusic) {
      try {
        await this.currentMusic.stopAsync();
        await this.currentMusic.unloadAsync();
      } catch {
        // already unloaded
      }
      this.currentMusic = null;
      this.currentMusicTrack = null;
    }
  }

  // ---- Sound Effects (fire-and-forget) ----

  async playSfx(source: number): Promise<void> {
    if (this.muted) return;
    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        volume: this.sfxVolume,
        shouldPlay: true,
      });
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if ('didJustFinish' in status && (status as any).didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (e) {
      console.warn('AudioManager: Failed to play SFX', e);
    }
  }

  async playRandomSfx(pool: number[]): Promise<void> {
    const index = Math.floor(Math.random() * pool.length);
    return this.playSfx(pool[index]);
  }

  // ---- Convenience methods ----

  async playBattleHit(): Promise<void> {
    const all = [...battleSounds.swords, ...battleSounds.impacts];
    return this.playRandomSfx(all);
  }

  async playHeavyImpact(): Promise<void> {
    return this.playRandomSfx(battleSounds.impacts);
  }

  async playCountdown(num: 3 | 2 | 1): Promise<void> {
    const map = {
      3: voiceOvers.countdown3,
      2: voiceOvers.countdown2,
      1: voiceOvers.countdown1,
    };
    return this.playSfx(map[num]);
  }

  async playResult(won: boolean): Promise<void> {
    return this.playSfx(won ? voiceOvers.youWin : voiceOvers.youLose);
  }

  async playUIClick(): Promise<void> {
    return this.playRandomSfx(uiSounds.click);
  }

  async cleanup(): Promise<void> {
    await this.stopMusic();
  }
}

export const AudioManager = new AudioManagerClass();
