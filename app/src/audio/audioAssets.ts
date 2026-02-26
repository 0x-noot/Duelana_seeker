// Centralized audio asset exports

// Background music (looping tracks)
export const music = {
  home: require('../../assets/audio/music/home_page.wav'),
  battle: require('../../assets/audio/music/battle_music.mp3'),
};

// Battle hit sounds (randomized pool for variety)
export const battleSounds = {
  swords: [
    require('../../assets/audio/sound_effects/battle_sounds/sword-1a.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/sword-1b.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/sword-arm-2a.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/sword-arm-2b.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - Swordsmall.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - Swordsmall_1.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - Swordsmall_2.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - Swordsmall_3.wav'),
  ],
  punches: [
    require('../../assets/audio/sound_effects/battle_sounds/punch_1a.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/punch_1b.wav'),
  ],
  impacts: [
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - new_hits_3.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - new_hits_4.wav'),
    require('../../assets/audio/sound_effects/battle_sounds/Socapex - small knock.wav'),
  ],
};

// Voice over clips
export const voiceOvers = {
  countdown3: require('../../assets/audio/sound_effects/voice_overs/3.ogg'),
  countdown2: require('../../assets/audio/sound_effects/voice_overs/2.ogg'),
  countdown1: require('../../assets/audio/sound_effects/voice_overs/1.ogg'),
  youWin: require('../../assets/audio/sound_effects/voice_overs/you_win.ogg'),
  youLose: require('../../assets/audio/sound_effects/voice_overs/you_lose.ogg'),
};

// UI interaction sounds
export const uiSounds = {
  click: [
    require('../../assets/audio/sound_effects/UI_sounds/hammer-arm-2a.wav'),
    require('../../assets/audio/sound_effects/UI_sounds/hammer-arm-2b.wav'),
  ],
};
