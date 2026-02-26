use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
pub struct ClaimTokenWinnings<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, duel.creator.as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
        constraint = duel.winner == winner.key() @ DuelanaError::NotWinner,
    )]
    pub duel: Account<'info, Duel>,

    #[account(
        mut,
        seeds = [TOKEN_ESCROW_SEED, duel.key().as_ref()],
        bump = duel.escrow_bump,
        token::mint = token_mint,
        token::authority = token_escrow,
    )]
    pub token_escrow: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = winner_token_account.mint == token_mint.key(),
        constraint = winner_token_account.owner == winner.key(),
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    /// CHECK: Treasury account validated against the hardcoded address.
    #[account(
        constraint = treasury.key().to_string() == TREASURY @ DuelanaError::InvalidDuelState,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = treasury_token_account.mint == token_mint.key(),
        constraint = treasury_token_account.owner == treasury.key(),
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimTokenWinnings>) -> Result<()> {
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

    // Verify escrow has enough tokens
    require!(
        ctx.accounts.token_escrow.amount >= total_pot,
        DuelanaError::InsufficientEscrow
    );

    let duel_key = duel.key();
    let escrow_bump = duel.escrow_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[TOKEN_ESCROW_SEED, duel_key.as_ref(), &[escrow_bump]]];

    // Transfer fee to treasury token account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_escrow.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.token_escrow.to_account_info(),
            },
            signer_seeds,
        ),
        fee,
    )?;

    // Transfer payout to winner token account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_escrow.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.token_escrow.to_account_info(),
            },
            signer_seeds,
        ),
        payout,
    )?;

    // Close the token escrow account, return rent to winner
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.token_escrow.to_account_info(),
            destination: ctx.accounts.winner.to_account_info(),
            authority: ctx.accounts.token_escrow.to_account_info(),
        },
        signer_seeds,
    ))?;

    duel.status = DuelStatus::Claimed;

    msg!(
        "Token winnings claimed: payout={}, fee={}, winner={}",
        payout,
        fee,
        duel.winner
    );
    Ok(())
}
