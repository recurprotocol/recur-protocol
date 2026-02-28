// ── Stake thresholds (in $RECUR, assuming 6 decimals) ────────────────────────
pub const MIN_STAKE_NANO:  u64 = 1_000  * 1_000_000; //  1,000 $RECUR
pub const MIN_STAKE_WARD:  u64 = 10_000 * 1_000_000; // 10,000 $RECUR
pub const MIN_STAKE_PRIME: u64 = 50_000 * 1_000_000; // 50,000 $RECUR

// ── Lock durations (in seconds) ───────────────────────────────────────────────
pub const LOCK_NONE:       i64 = 0;                        // flexible, no lock
pub const LOCK_3_MONTHS:   i64 = 90  * 24 * 60 * 60;      // 3 months
pub const LOCK_6_MONTHS:   i64 = 180 * 24 * 60 * 60;      // 6 months
pub const LOCK_12_MONTHS:  i64 = 365 * 24 * 60 * 60;      // 12 months

// ── APY rates in basis points ─────────────────────────────────────────────────
pub const APY_FLEXIBLE:    u16 = 800;   //  8% APY — no lock
pub const APY_3_MONTHS:    u16 = 1_200; // 12% APY — 3 month lock
pub const APY_6_MONTHS:    u16 = 1_600; // 16% APY — 6 month lock
pub const APY_12_MONTHS:   u16 = 2_000; // 20% APY — 12 month lock

// ── Reward schedule ───────────────────────────────────────────────────────────
pub const EPOCH_SECONDS:   u64 = 7 * 24 * 60 * 60; // weekly rewards (Sunday 12:00 UTC)

// ── Slashing ──────────────────────────────────────────────────────────────────
pub const MAX_SLASH_BPS:   u16 = 2_000; // max 20% slash per event
