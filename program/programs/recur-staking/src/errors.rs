use anchor_lang::prelude::*;

#[error_code]
pub enum RecurError {
    #[msg("Stake amount below minimum threshold for any node tier")]
    InsufficientStake,

    #[msg("Tokens are still within the lock period")]
    LockPeriodActive,

    #[msg("No pending rewards to claim")]
    NoPendingRewards,

    #[msg("Node is not currently active")]
    NodeInactive,

    #[msg("Slash basis points exceed maximum allowed (2000 bps = 20%)")]
    SlashTooHigh,

    #[msg("Uptime value must be between 0 and 10000 basis points")]
    InvalidUptime,

    #[msg("Invalid lock duration selected")]
    InvalidLockDuration,

    #[msg("Arithmetic overflow")]
    Overflow,
}
