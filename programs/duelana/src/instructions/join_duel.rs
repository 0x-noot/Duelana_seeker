use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::Discriminator;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[vrf]
#[derive(Accounts)]
pub struct JoinDuel<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, duel.creator.as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
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

    /// CHECK: MagicBlock VRF oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

pub fn handler(ctx: Context<JoinDuel>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.status == DuelStatus::Waiting, DuelanaError::InvalidDuelState);
    require!(
        ctx.accounts.challenger.key() != duel.creator,
        DuelanaError::CreatorCannotJoin
    );

    // Transfer matching bet amount from challenger to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.challenger.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        duel.bet_amount,
    )?;

    duel.challenger = ctx.accounts.challenger.key();
    duel.status = DuelStatus::Active;

    msg!(
        "Duel joined: challenger={}, escrow now holds {} lamports",
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

    msg!("VRF randomness requested for duel");
    Ok(())
}
