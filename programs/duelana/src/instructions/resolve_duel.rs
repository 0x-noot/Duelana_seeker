use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::DuelanaError;
use crate::state::{Duel, DuelStatus};

#[derive(Accounts)]
pub struct ResolveDuel<'info> {
    /// In production: the MagicBlock VRF program identity (verified via address constraint).
    /// In testing: any signer can resolve (feature = "testing").
    #[cfg(not(feature = "testing"))]
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    #[cfg(feature = "testing")]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [DUEL_SEED, duel.creator.as_ref(), &duel.created_at.to_le_bytes()],
        bump = duel.duel_bump,
    )]
    pub duel: Account<'info, Duel>,
}

pub fn handler(ctx: Context<ResolveDuel>, result: [u8; 32]) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.status == DuelStatus::Active, DuelanaError::InvalidDuelState);

    // Store the VRF result
    duel.vrf_result = Some(result);

    // Determine winner: first byte < 128 = creator wins, otherwise challenger wins
    // This gives exactly 50/50 odds (128/256 = 0.5)
    if result[0] < 128 {
        duel.winner = duel.creator;
    } else {
        duel.winner = duel.challenger;
    }

    duel.status = DuelStatus::Resolved;

    msg!(
        "Duel resolved via VRF: winner={}, vrf_byte={}",
        duel.winner,
        result[0]
    );
    Ok(())
}
