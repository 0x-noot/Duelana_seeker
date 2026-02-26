use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3gE3AwSm9yVYCTSXHFiqWShzoU5vGjwTXJRL7WLz6vNv");

#[program]
pub mod duelana {
    use super::*;

    pub fn create_duel(ctx: Context<CreateDuel>, bet_amount: u64, created_at: i64) -> Result<()> {
        instructions::create_duel::handler(ctx, bet_amount, created_at)
    }

    pub fn join_duel(ctx: Context<JoinDuel>) -> Result<()> {
        instructions::join_duel::handler(ctx)
    }

    pub fn resolve_duel(ctx: Context<ResolveDuel>, result: [u8; 32]) -> Result<()> {
        instructions::resolve_duel::handler(ctx, result)
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    pub fn cancel_duel(ctx: Context<CancelDuel>) -> Result<()> {
        instructions::cancel_duel::handler(ctx)
    }

    pub fn create_token_duel(ctx: Context<CreateTokenDuel>, bet_amount: u64, created_at: i64) -> Result<()> {
        instructions::create_token_duel::handler(ctx, bet_amount, created_at)
    }

    pub fn join_token_duel(ctx: Context<JoinTokenDuel>) -> Result<()> {
        instructions::join_token_duel::handler(ctx)
    }

    pub fn claim_token_winnings(ctx: Context<ClaimTokenWinnings>) -> Result<()> {
        instructions::claim_token_winnings::handler(ctx)
    }

    pub fn cancel_token_duel(ctx: Context<CancelTokenDuel>) -> Result<()> {
        instructions::cancel_token_duel::handler(ctx)
    }
}
