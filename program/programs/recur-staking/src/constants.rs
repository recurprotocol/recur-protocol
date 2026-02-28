// ── Stake thresholds (in $RECUR, assuming 6 decimals) ────────────────────────
pub const MIN_STAKE_NANO:  u64 = 1_000  * 1_000_000; //  1,000 $RECUR
pub const MIN_STAKE_WARD:  u64 = 10_000 * 1_000_000; // 10,000 $RECUR
pub const MIN_STAKE_PRIME: u64 = 50_000 * 1_000_000; // 50,000 $RECUR

// ── Time constants ────────────────────────────────────────────────────────────
pub const LOCK_PERIOD_SECONDS: i64 = 7 * 24 * 60 * 60; // 7 days
pub const EPOCH_SECONDS:        u64 = 2 * 24 * 60 * 60; // ~1 Solana epoch ≈ 2 days

// ── Slashing ──────────────────────────────────────────────────────────────────
pub const MAX_SLASH_BPS: u16 = 2_000; // max 20% slash per event
