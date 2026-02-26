use anchor_lang::prelude::*;

#[error_code]
pub enum DuelanaError {
    #[msg("Duel is not in the expected state")]
    InvalidDuelState,
    #[msg("Bet amount must be greater than zero")]
    InvalidBetAmount,
    #[msg("Creator cannot join their own duel")]
    CreatorCannotJoin,
    #[msg("Only the winner can claim")]
    NotWinner,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrow,
    #[msg("VRF result not yet available")]
    VrfNotReady,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unsupported token mint")]
    UnsupportedMint,
}
