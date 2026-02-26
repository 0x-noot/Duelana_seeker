use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
#[instruction(bet_amount: u64, created_at: i64)]
pub struct CreateTokenDuel<'info> {
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

    #[account(
        init,
        payer = creator,
        seeds = [TOKEN_ESCROW_SEED, duel.key().as_ref()],
        bump,
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

    #[account(
        constraint = token_mint.key().to_string() == SKR_MINT @ DuelanaError::UnsupportedMint,
    )]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTokenDuel>, bet_amount: u64, created_at: i64) -> Result<()> {
    require!(bet_amount > 0, DuelanaError::InvalidBetAmount);

    let duel = &mut ctx.accounts.duel;
    duel.creator = ctx.accounts.creator.key();
    duel.challenger = Pubkey::default();
    duel.bet_amount = bet_amount;
    duel.token_mint = ctx.accounts.token_mint.key();
    duel.fee_bps = SKR_FEE_BASIS_POINTS as u16;
    duel.status = DuelStatus::Waiting;
    duel.winner = Pubkey::default();
    duel.escrow_bump = ctx.bumps.token_escrow;
    duel.duel_bump = ctx.bumps.duel;
    duel.created_at = created_at;
    duel.vrf_result = None;

    // Transfer tokens from creator to escrow
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.token_escrow.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        bet_amount,
    )?;

    msg!(
        "Token duel created: bet={} tokens, mint={}, creator={}",
        bet_amount,
        duel.token_mint,
        duel.creator
    );
    Ok(())
}
