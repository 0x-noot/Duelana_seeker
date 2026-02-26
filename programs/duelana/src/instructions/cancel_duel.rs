use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
pub struct CancelDuel<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, creator.key().as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
        has_one = creator,
        close = creator,
    )]
    pub duel: Account<'info, Duel>,

    /// CHECK: Escrow PDA that holds the escrowed lamports.
    #[account(
        mut,
        seeds = [ESCROW_SEED, duel.key().as_ref()],
        bump = duel.escrow_bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;
    require!(duel.status == DuelStatus::Waiting, DuelanaError::InvalidDuelState);

    let bet_amount = duel.bet_amount;
    let duel_key = duel.key();
    let escrow_bump = duel.escrow_bump;

    duel.status = DuelStatus::Cancelled;

    // Transfer escrow lamports back to creator via CPI
    // (escrow is system-owned, so direct lamport manipulation is not allowed)
    let signer_seeds: &[&[&[u8]]] = &[&[ESCROW_SEED, duel_key.as_ref(), &[escrow_bump]]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
            signer_seeds,
        ),
        bet_amount,
    )?;

    msg!("Duel cancelled, {} lamports returned to creator", bet_amount);
    // Note: duel account is closed via `close = creator` constraint
    Ok(())
}
