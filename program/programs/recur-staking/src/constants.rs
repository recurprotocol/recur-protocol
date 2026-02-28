// ── Stake thresholds (in $RECUR, assuming 6 decimals) ────────────────────────
pub const MIN_STAKE_NANO:  u64 = 10_000   * 1_000_000; //  10,000 $RECUR
pub const MIN_STAKE_WARD:  u64 = 100_000  * 1_000_000; // 100,000 $RECUR
pub const MIN_STAKE_PRIME: u64 = 1_000_000 * 1_000_000; // 1,000,000 $RECUR
pub const MAX_STAKE:       u64 = 1_000_000 * 1_000_000; // 1,000,000 $RECUR per wallet

// ── Tier multipliers in basis points ─────────────────────────────────────────
// Multipliers only activate after MULTIPLIER_ACTIVATION_PERIOD
pub const MULTIPLIER_NANO:  u16 = 10_000; // 1.0x  — always active
pub const MULTIPLIER_WARD:  u16 = 12_500; // 1.25x — activates after 3 months
pub const MULTIPLIER_PRIME: u16 = 15_000; // 1.5x  — activates after 3 months
pub const MULTIPLIER_ACTIVATION_PERIOD: i64 = 90 * 24 * 60 * 60; // 3 months

// ── Lock durations (in seconds) ───────────────────────────────────────────────
pub const LOCK_NONE:      i64 = 0;
pub const LOCK_3_MONTHS:  i64 = 90  * 24 * 60 * 60;
pub const LOCK_6_MONTHS:  i64 = 180 * 24 * 60 * 60;
pub const LOCK_12_MONTHS: i64 = 365 * 24 * 60 * 60;

// ── APY rates in basis points ─────────────────────────────────────────────────
pub const APY_FLEXIBLE:   u16 = 800;   //  8% APY — no lock
pub const APY_3_MONTHS:   u16 = 1_200; // 12% APY — 3 month lock
pub const APY_6_MONTHS:   u16 = 1_600; // 16% APY — 6 month lock
pub const APY_12_MONTHS:  u16 = 2_000; // 20% APY — 12 month lock

// ── Reward schedule ───────────────────────────────────────────────────────────
pub const EPOCH_SECONDS:  u64 = 7 * 24 * 60 * 60; // weekly — Sunday 12:00 UTC

// ── Slashing ──────────────────────────────────────────────────────────────────
pub const MAX_SLASH_BPS:  u16 = 2_000; // max 20% slash per event
