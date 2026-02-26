use anchor_lang::prelude::*;
use anchor_lang::Discriminator;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[vrf]
#[derive(Accounts)]
pub struct JoinTokenDuel<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, duel.creator.as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
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
        constraint = challenger_token_account.mint == token_mint.key(),
        constraint = challenger_token_account.owner == challenger.key(),
    )]
    pub challenger_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: MagicBlock VRF oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

pub fn handler(ctx: Context<JoinTokenDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.status == DuelStatus::Waiting, DuelanaError::InvalidDuelState);
    require!(
        ctx.accounts.challenger.key() != duel.creator,
        DuelanaError::CreatorCannotJoin
    );

    // Transfer matching bet amount from challenger to escrow
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.challenger_token_account.to_account_info(),
                to: ctx.accounts.token_escrow.to_account_info(),
                authority: ctx.accounts.challenger.to_account_info(),
            },
        ),
        duel.bet_amount,
    )?;

    duel.challenger = ctx.accounts.challenger.key();
    duel.status = DuelStatus::Active;

    msg!(
        "Token duel joined: challenger={}, escrow now holds {} tokens",
        duel.challenger,
        duel.bet_amount.checked_mul(2).unwrap()
    );

    // Request VRF randomness with callback to resolve_duel
    let mut caller_seed = [0u8; 32];
    caller_seed[..8].copy_from_slice(&duel.created_at.to_le_bytes());

    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.challenger.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: crate::ID,
        callback_discriminator: crate::instruction::ResolveDuel::DISCRIMINATOR.to_vec(),
        caller_seed,
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.duel.key(),
            is_signer: false,
            is_writable: true,
        }]),
        ..Default::default()
    });

    ctx.accounts
        .invoke_signed_vrf(&ctx.accounts.challenger.to_account_info(), &ix)?;

    msg!("VRF randomness requested for token duel");
    Ok(())
}
