# Duelana

> A provably fair on-chain dueling game built for the **Solana Seeker** phone.

Duelana is a medieval pixel art fighting game at heart — but underneath the swords and fanfare it's a 50/50 wager resolved by **MagicBlock VRF**. Two players lock SOL or SKR tokens in escrow, the VRF oracle picks a winner, and a ~26-second sprite animation plays out the dramatic result.

Deployed to **Solana Devnet** and playable on Android via the Solana Mobile Stack or in Web browsers.

---

## Game Flow

1. Open the app and connect your wallet (Mobile Wallet Adapter)
2. **Create a Duel** — pick SOL or SKR, choose a bet size, sign a transaction that escrows your funds
3. Your duel appears live in the **Lobby** for anyone to join
4. A second player **joins** the duel, depositing the matching bet — VRF is triggered immediately
5. MagicBlock VRF resolves the 50/50 outcome on-chain
6. Both players see a pixel art **duel animation** with hitsplats, health bars, and sound effects
7. The winner reaches the **Results screen** and claims their payout (minus the protocol fee)

---

## Features

- **SOL & SKR wagering** — native SOL or SPL token duels, each with their own fee rate
- **Provably fair** — MagicBlock VRF provides verifiable on-chain randomness
- **Live lobby** — WebSocket + polling so open duels appear in real time
- **Pixel art duel animation** — ~26s sequence: idle → countdown → walk → clash → K.O.
- **RuneScape-style hitsplats** — chunked HP bars drain as hits land every 800 ms
- **Audio** — background music, countdown voice-overs, battle SFX, win/lose clips
- **Cancel & history** — creators can cancel waiting duels; past duels tracked with P&L stats
- **"How It Works" modal** — in-app explainer covering odds, fees, VRF, and the full game loop

---

## Tech Stack

| Layer | Technology |
|---|---|
| On-chain program | Anchor 0.30.1 (Rust), deployed to Devnet |
| SPL token support | anchor-spl 0.30.1 |
| Verifiable randomness | MagicBlock VRF (ephemeral-vrf-sdk 0.2.3) |
| Mobile app | Expo ~51 / React Native 0.74 |
| Wallet integration | Solana Mobile Wallet Adapter (MWA) |
| Anchor client | @coral-xyz/anchor ^0.30.1 |
| Solana JS SDK | @solana/web3.js ^1.95.0 |
| Audio | expo-av ~14.0.7 |
| Font | PressStart2P (8-bit retro) |
| Navigation | React Navigation v6 |

---

## Project Structure

```
Duelana_seeker/
├── programs/duelana/       # On-chain Anchor program (9 instructions)
│   └── src/
│       ├── lib.rs           # Entrypoint, instruction handlers
│       ├── state.rs         # Duel account struct (190 bytes)
│       ├── errors.rs        # Custom error codes
│       ├── constants.rs     # Treasury, fee bps, PDA seeds, SKR mint
│       └── instructions/    # One file per instruction
├── app/                     # Expo React Native mobile app
│   ├── App.tsx              # Root: providers + navigation
│   ├── src/
│   │   ├── screens/         # HomeScreen, CreateDuel, Lobby, Animation, Results, History
│   │   ├── components/      # SpriteButton, ScrollPanel, SpriteAnimator, DuelCard, ...
│   │   ├── hooks/           # useDuelanaProgram, useDuelSubscription, useBalance
│   │   ├── providers/       # ConnectionProvider, WalletProvider (MWA)
│   │   ├── audio/           # AudioManager singleton + React hooks
│   │   ├── utils/           # constants, PDA derivation, formatting
│   │   └── idl/             # duelana.json (hand-maintained Anchor IDL)
│   └── assets/
│       ├── sprites/         # Pre-upscaled pixel art (backgrounds, buttons, characters)
│       └── audio/           # Music, battle SFX, voice-overs
├── tests/
│   └── duelana.test.ts      # 8 TypeScript integration tests (SOL duels)
├── scripts/
│   └── split_sprites.py     # Splits Unity sprite sheets → individual frames (3× upscale)
├── target/
│   └── deploy/duelana.so    # Compiled program binary
└── CLAUDE.md                # Full developer reference (architecture, patterns, gotchas)
```

---

## Key Constants

| Constant | Value |
|---|---|
| Program ID | `3gE3AwSm9yVYCTSXHFiqWShzoU5vGjwTXJRL7WLz6vNv` |
| Network | Devnet |
| Treasury | `6uT7LVyYWZS37pC2cv4FtMeMT9ScnivjukxfxFgbgEPY` |
| SKR Token Mint | `9DdqwXM6BRWLdMesSf2fBWp9ZgeoJ2Qbr8rVKnyGAW2T` |
| SOL Protocol Fee | 3% (300 bps) |
| SKR Protocol Fee | 1% (100 bps) |
| VRF Oracle Queue | `Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh` |
| Win condition | `vrf_result[0] < 128` → creator wins |

---


## License

See [LICENSE](./LICENSE).
