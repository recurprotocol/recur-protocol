use anchor_lang::prelude::*;
use crate::errors::RecurError;
use crate::constants::*;

// ── RewardPool ────────────────────────────────────────────────────────────────
#[account]
pub struct RewardPool {
    pub authority:    Pubkey,   // protocol admin
    pub reward_mint:  Pubkey,   // $RECUR mint
    pub reward_vault: Pubkey,   // vault holding reward tokens
    pub reward_rate:  u64,      // base tokens distributed per epoch
    pub total_staked: u64,      // total $RECUR staked across all positions
    pub total_stakers: u32,     // number of active stakers
    pub epoch_start:  i64,      // unix timestamp of current epoch start
    pub bump:         u8,
}

impl RewardPool {
    pub const LEN: usize = 8
        + 32 + 32 + 32
        + 8 + 8 + 4 + 8
        + 1;
}

// ── StakeAccount ──────────────────────────────────────────────────────────────
#[account]
pub struct StakeAccount {
    pub staker:          Pubkey,
    pub amount:          u64,       // total $RECUR staked
    pub tier:            NodeTier,
    pub lock_duration:   i64,       // 0 = flexible, else seconds locked
    pub staked_at:       i64,       // timestamp of stake
    pub unlock_at:       i64,       // timestamp when tokens can be withdrawn
    pub last_claim:      i64,       // timestamp of last reward claim
    pub auto_compound:   bool,      // opt-in auto-compounding
    pub uptime_bps:      u16,       // node uptime in basis points
    pub active:          bool,
    pub bump:            u8,
}

impl StakeAccount {
    pub const LEN: usize = 8
        + 32        // staker
        + 8         // amount
        + 1         // tier enum
        + 8 + 8 + 8 + 8  // lock_duration, staked_at, unlock_at, last_claim
        + 1         // auto_compound
        + 2         // uptime_bps
        + 1 + 1;    // active + bump
}

// ── LockDuration enum ─────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LockDuration {
    Flexible,    // 0 months — 8% APY
    ThreeMonths, // 3 months — 12% APY
    SixMonths,   // 6 months — 16% APY
    TwelveMonths,// 12 months — 20% APY
}

impl LockDuration {
    pub fn to_seconds(&self) -> i64 {
        match self {
            LockDuration::Flexible     => LOCK_NONE,
            LockDuration::ThreeMonths  => LOCK_3_MONTHS,
            LockDuration::SixMonths    => LOCK_6_MONTHS,
            LockDuration::TwelveMonths => LOCK_12_MONTHS,
        }
    }

    pub fn apy_bps(&self) -> u16 {
        match self {
            LockDuration::Flexible     => APY_FLEXIBLE,
            LockDuration::ThreeMonths  => APY_3_MONTHS,
            LockDuration::SixMonths    => APY_6_MONTHS,
            LockDuration::TwelveMonths => APY_12_MONTHS,
        }
    }
}

// ── NodeTier ──────────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum NodeTier {
    Nano,   // >= 1,000  $RECUR
    Ward,   // >= 10,000 $RECUR
    Prime,  // >= 50,000 $RECUR
}

impl NodeTier {
    pub fn from_amount(amount: u64) -> Result<Self> {
        if amount >= MIN_STAKE_PRIME {
            Ok(NodeTier::Prime)
        } else if amount >= MIN_STAKE_WARD {
            Ok(NodeTier::Ward)
        } else if amount >= MIN_STAKE_NANO {
            Ok(NodeTier::Nano)
        } else {
            Err(RecurError::InsufficientStake.into())
        }
    }

    pub fn multiplier_bps(&self) -> u16 {
        match self {
            NodeTier::Nano  => 10_000,
            NodeTier::Ward  => 17_500,
            NodeTier::Prime => 27_500,
        }
