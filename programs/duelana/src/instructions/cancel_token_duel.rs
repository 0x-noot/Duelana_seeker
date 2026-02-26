use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
pub struct CancelTokenDuel<'info> {
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
        constraint = creator_token_account.mint == token_mint.key(),
        constraint = creator_token_account.owner == creator.key(),
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelTokenDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;
    require!(duel.status == DuelStatus::Waiting, DuelanaError::InvalidDuelState);

    let bet_amount = duel.bet_amount;
    let duel_key = duel.key();
    let escrow_bump = duel.escrow_bump;

    duel.status = DuelStatus::Cancelled;

    let signer_seeds: &[&[&[u8]]] = &[&[TOKEN_ESCROW_SEED, duel_key.as_ref(), &[escrow_bump]]];

    // Transfer tokens back to creator
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_escrow.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.token_escrow.to_account_info(),
            },
            signer_seeds,
        ),
        bet_amount,
    )?;

    // Close the token escrow account, return rent to creator
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.token_escrow.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: ctx.accounts.token_escrow.to_account_info(),
        },
        signer_seeds,
    ))?;

    msg!("Token duel cancelled, {} tokens returned to creator", bet_amount);
    // Note: duel account is closed via `close = creator` constraint
    Ok(())
}
