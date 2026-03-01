use anchor_lang::prelude::*;

#[error_code]
pub enum RecurError {
    #[msg("Stake amount below minimum threshold for any node tier")]
    InsufficientStake,

    #[msg("Stake amount exceeds maximum allowed per wallet (1,000,000 $RECUR)")]
    ExceedsMaxStake,

    #[msg("Tokens are still locked — wait until unlock_at")]
    LockPeriodActive,

    #[msg("No pending rewards to claim")]
    NoPendingRewards,

    #[msg("Node is not currently active")]
    NodeInactive,

    #[msg("Slash basis points exceed maximum allowed (2000 bps = 20%)")]
    SlashTooHigh,

    #[msg("Uptime value must be between 0 and 10000 basis points")]
    InvalidUptime,

    #[msg("Arithmetic overflow")]
    Overflow,
}
