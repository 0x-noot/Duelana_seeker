use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
#[instruction(bet_amount: u64, created_at: i64)]
pub struct CreateDuel<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Duel::INIT_SPACE,
        seeds = [DUEL_SEED, creator.key().as_ref(), &created_at.to_le_bytes()],
        bump,
    )]
    pub duel: Account<'info, Duel>,

    /// CHECK: This is a PDA used solely to hold lamports as escrow.
    #[account(
        mut,
        seeds = [ESCROW_SEED, duel.key().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateDuel>, bet_amount: u64, created_at: i64) -> Result<()> {
    require!(bet_amount > 0, DuelanaError::InvalidBetAmount);

    let duel = &mut ctx.accounts.duel;
    duel.creator = ctx.accounts.creator.key();
    duel.challenger = Pubkey::default();
    duel.bet_amount = bet_amount;
    duel.token_mint = Pubkey::default(); // native SOL
    duel.fee_bps = FEE_BASIS_POINTS as u16;
    duel.status = DuelStatus::Waiting;
    duel.winner = Pubkey::default();
    duel.escrow_bump = ctx.bumps.escrow;
    duel.duel_bump = ctx.bumps.duel;
    duel.created_at = created_at;
    duel.vrf_result = None;

    // Transfer bet amount from creator to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        bet_amount,
    )?;

    msg!("Duel created: bet={} lamports, creator={}", bet_amount, duel.creator);
    Ok(())
}
