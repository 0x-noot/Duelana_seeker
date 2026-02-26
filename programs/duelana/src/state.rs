use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Duel {
    pub creator: Pubkey,
    pub challenger: Pubkey,
    pub bet_amount: u64,
    pub token_mint: Pubkey,    // Pubkey::default() = native SOL, otherwise SPL token mint
    pub fee_bps: u16,          // fee in basis points (300 = 3% for SOL, 100 = 1% for SKR)
    pub status: DuelStatus,
    pub winner: Pubkey,
    pub escrow_bump: u8,
    pub duel_bump: u8,
    pub created_at: i64,
    pub vrf_result: Option<[u8; 32]>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum DuelStatus {
    Waiting,
    Active,
    Resolved,
    Claimed,
    Cancelled,
}
