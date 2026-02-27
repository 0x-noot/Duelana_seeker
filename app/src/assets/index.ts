// Centralized asset exports for medieval pixel art sprites

// Backgrounds
export const backgrounds = {
  castle: require('../../assets/sprites/web_sprites/CASTLE-MAIN_MENU_BG.png'),
  castleWithLogo: require('../../assets/sprites/web_sprites/background.png'),
  homeNew: require('../../assets/sprites/web_sprites/background_new.png'),
  battlefield: require('../../assets/sprites/web_sprites/battlefiled_temporary.png'),
  duelArena: require('../../assets/sprites/web_sprites/duel_arena.png'),
};

// Logo
export const logo = require('../../assets/sprites/web_sprites/Logo.png');

// Buttons (normal + pressed states)
export const buttons = {
  longUp: require('../../assets/sprites/web_sprites/button-long-up.png'),
  longDown: require('../../assets/sprites/web_sprites/button-long-down.png'),
  smallUp: require('../../assets/sprites/web_sprites/button-smol-up.png'),
  smallDown: require('../../assets/sprites/web_sprites/button-smol-down.png'),
};

// Panels and Scrolls (parchment containers)
export const panels = {
  popup: require('../../assets/sprites/web_sprites/popup-menu.png'),
  medScroll: require('../../assets/sprites/web_sprites/med-scroll.png'),
  longScroll: require('../../assets/sprites/web_sprites/lrg-lonk-scroll.png'),
  middleMenu: require('../../assets/sprites/web_sprites/middle menu.png'),
  rightMenu: require('../../assets/sprites/web_sprites/right menu.png'),
  orderPaper: require('../../assets/sprites/web_sprites/order-paper-med.png'),
  orderPaper2: require('../../assets/sprites/web_sprites/order-paper-med2.png'),
  middleUI: require('../../assets/sprites/web_sprites/Middle_UI_Scroll.png'),
  leftUI: require('../../assets/sprites/web_sprites/Left_UI_Scroll.png'),
  rightUI: require('../../assets/sprites/web_sprites/RIght_UI_Scroll.png'),
};

// Token logos
export const tokenLogos = {
  sol: require('../../assets/sprites/web_sprites/solana_logo.png'),
  skr: require('../../assets/sprites/web_sprites/SKR_logo.png'),
};

// Decorative UI elements
export const ui = {
  pfpHolder: require('../../assets/sprites/web_sprites/PFP-holder.png'),
  healthBar: require('../../assets/sprites/web_sprites/health bar.png'),
  torch: require('../../assets/sprites/web_sprites/torch_sprite.png'),
  hitsplat: require('../../assets/sprites/web_sprites/hitsplat.png'),
};

// Fighter character sprites (pre-split frames, 3x upscaled)
export const fighters = {
  barbarian: {
    idle: [
      require('../../assets/sprites/web_sprites/units/barbarian/frames/idle_0.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/idle_1.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/idle_2.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/idle_3.png'),
    ],
    walkDown: [
      require('../../assets/sprites/web_sprites/units/barbarian/frames/walk_down_0.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/walk_down_1.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/walk_down_2.png'),
    ],
    attackDown: [
      require('../../assets/sprites/web_sprites/units/barbarian/frames/attack_down_0.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/attack_down_1.png'),
      require('../../assets/sprites/web_sprites/units/barbarian/frames/attack_down_2.png'),
    ],
  },
  berserker: {
    idle: [
      require('../../assets/sprites/web_sprites/units/berserker/frames/idle_0.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/idle_1.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/idle_2.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/idle_3.png'),
    ],
    walkUp: [
      require('../../assets/sprites/web_sprites/units/berserker/frames/walk_up_0.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/walk_up_1.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/walk_up_2.png'),
    ],
    attackUp: [
      require('../../assets/sprites/web_sprites/units/berserker/frames/attack_up_0.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/attack_up_1.png'),
      require('../../assets/sprites/web_sprites/units/berserker/frames/attack_up_2.png'),
    ],
  },
};
