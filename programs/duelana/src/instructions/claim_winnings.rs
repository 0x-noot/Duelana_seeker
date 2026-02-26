use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, duel.creator.as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
        constraint = duel.winner == winner.key() @ DuelanaError::NotWinner,
    )]
    pub duel: Account<'info, Duel>,

    /// CHECK: Escrow PDA that holds the escrowed lamports.
    #[account(
        mut,
        seeds = [ESCROW_SEED, duel.key().as_ref()],
        bump = duel.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: Treasury account validated against the hardcoded address.
    #[account(
        mut,
        constraint = treasury.key().to_string() == TREASURY @ DuelanaError::InvalidDuelState,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.status == DuelStatus::Resolved, DuelanaError::InvalidDuelState);

    let total_pot = duel
        .bet_amount
        .checked_mul(2)
        .ok_or(DuelanaError::Overflow)?;
    let fee = total_pot
        .checked_mul(duel.fee_bps as u64)
        .ok_or(DuelanaError::Overflow)?
        .checked_div(10_000)
        .ok_or(DuelanaError::Overflow)?;
    let payout = total_pot
        .checked_sub(fee)
        .ok_or(DuelanaError::Overflow)?;

    let escrow_info = ctx.accounts.escrow.to_account_info();

    // Verify escrow has enough lamports
    require!(
        escrow_info.lamports() >= total_pot,
        DuelanaError::InsufficientEscrow
    );

    let duel_key = duel.key();
    let escrow_bump = duel.escrow_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[ESCROW_SEED, duel_key.as_ref(), &[escrow_bump]]];

    // Transfer fee to treasury via CPI
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
            signer_seeds,
        ),
        fee,
    )?;

    // Transfer payout + any remaining rent to winner via CPI
    let remaining = ctx.accounts.escrow.to_account_info().lamports();
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer_seeds,
        ),
        remaining,
    )?;

    duel.status = DuelStatus::Claimed;

    msg!(
        "Winnings claimed: payout={}, fee={}, winner={}",
        payout,
        fee,
        duel.winner
    );
    Ok(())
}
