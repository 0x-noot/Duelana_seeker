import { useEffect, useState, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AudioManager } from './AudioManager';

type MusicTrack = 'home' | 'battle';

/**
 * Plays background music when the screen is focused.
 * Respects mute state — if muted, music won't start.
 * When unmuted, the current screen's track resumes.
 */
export function useScreenMusic(track: MusicTrack) {
  const isFocused = useIsFocused();
  const muted = useMuted();

  useEffect(() => {
    if (isFocused && !muted) {
      AudioManager.playMusic(track);
    }
  }, [isFocused, track, muted]);
}

/** Subscribe to the mute state. Re-renders when mute toggles. */
export function useMuted(): boolean {
  const [muted, setMuted] = useState(AudioManager.isMuted());

  useEffect(() => {
    return AudioManager.onMuteChange(setMuted);
  }, []);

  return muted;
}

/** Toggle mute on/off. */
export function useToggleMute(): () => void {
  return useCallback(() => { AudioManager.toggleMute(); }, []);
}

/** Direct access to the AudioManager singleton for SFX calls. */
export function useAudioManager() {
  return AudioManager;
}
