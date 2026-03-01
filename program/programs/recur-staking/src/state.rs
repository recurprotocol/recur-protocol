use anchor_lang::prelude::*;
use crate::errors::RecurError;
use crate::constants::*;

// ── RewardPool ────────────────────────────────────────────────────────────────
/// Global singleton — stores protocol-level staking state

#[account]
pub struct RewardPool {
    pub authority:         Pubkey,  // protocol admin
    pub reward_mint:       Pubkey,  // $RECUR mint
    pub reward_vault:      Pubkey,  // vault holding reward tokens
    pub stake_vault:       Pubkey,  // vault holding staked tokens
    pub reward_rate:       u64,     // tokens distributed per epoch (legacy / reference)
    pub total_staked:      u64,     // total $RECUR staked across all nodes
    pub total_stakers:     u32,     // number of active stakers
    pub epoch_start:       i64,     // unix timestamp of current epoch start
    pub pool_bump:         u8,      // PDA bump for reward_pool
    pub reward_vault_bump: u8,      // PDA bump for reward_vault
    pub stake_vault_bump:  u8,      // PDA bump for stake_vault
}

impl RewardPool {
    pub const LEN: usize = 8       // discriminator
        + 32 + 32 + 32 + 32        // 4 pubkeys
        + 8 + 8                     // u64s (reward_rate, total_staked)
        + 4                         // u32  (total_stakers)
        + 8                         // i64  (epoch_start)
        + 1 + 1 + 1;               // 3 bumps
}

// ── StakeAccount ──────────────────────────────────────────────────────────────
/// Per-staker account — one PDA per wallet

#[account]
pub struct StakeAccount {
    pub staker:        Pubkey,
    pub amount:        u64,     // total $RECUR staked
    pub tier:          NodeTier,
    pub staked_at:     i64,     // unix timestamp of initial stake
    pub last_claim:    i64,     // timestamp of last reward claim
    pub lock_duration: i64,     // lock duration in seconds (0 = flexible)
    pub unlock_at:     i64,     // unix timestamp when tokens unlock (0 = flexible)
    pub auto_compound: bool,    // whether to auto-compound rewards
    pub uptime_bps:    u16,     // node uptime in basis points (10000 = 100%)
    pub active:        bool,
    pub bump:          u8,
}

impl StakeAccount {
    pub const LEN: usize = 8       // discriminator
        + 32                        // staker pubkey
        + 8                         // amount
        + 1                         // tier enum
        + 8 + 8                     // staked_at, last_claim
        + 8 + 8                     // lock_duration, unlock_at
        + 1                         // auto_compound
        + 2                         // uptime_bps
        + 1 + 1;                    // active + bump
}

// ── NodeTier ─────────────────────────────────────────────────────────────────

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

    /// Reward multiplier in basis points — activates after 3 months staking
    /// Before activation: all tiers get 1.0x (10000 bps)
    /// After activation:  Nano 1.0x, Ward 1.25x, Prime 1.5x
    pub fn multiplier_bps(&self, staked_at: i64, now: i64) -> u16 {
        let elapsed = now.saturating_sub(staked_at);
        if elapsed < MULTIPLIER_ACTIVATION_PERIOD {
            return MULTIPLIER_NANO; // 1.0x until activation
        }
        match self {
            NodeTier::Nano  => MULTIPLIER_NANO,
            NodeTier::Ward  => MULTIPLIER_WARD,
            NodeTier::Prime => MULTIPLIER_PRIME,
        }
    }
}

// ── LockDuration ─────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LockDuration {
    Flexible,
    ThreeMonths,
    SixMonths,
    TwelveMonths,
}

impl LockDuration {
    pub fn to_seconds(&self) -> i64 {
        match self {
            LockDuration::Flexible     => 0,
            LockDuration::ThreeMonths  => LOCK_3_MONTHS,
            LockDuration::SixMonths    => LOCK_6_MONTHS,
            LockDuration::TwelveMonths => LOCK_12_MONTHS,
        }
    }
}
