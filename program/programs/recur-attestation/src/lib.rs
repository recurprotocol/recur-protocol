use anchor_lang::prelude::*;

declare_id!("3ZLSqgGoUH3cQbDLV6QXDLRXGzgCsmY9oMGx8qwMM24Y");

pub const MAX_EVENT_ID_LEN: usize = 36;  // UUID
pub const MAX_THREAT_TYPE_LEN: usize = 32;

#[program]
pub mod recur_attestation {
    use super::*;

    /// Write an immutable on-chain attestation for a blocked threat event.
    /// One PDA per event_id — init only, no update, no delete.
    pub fn attest_threat(
        ctx: Context<AttestThreat>,
        event_id: String,
        threat_type: String,
        severity: u8,
        timestamp: i64,
        prompt_hash: [u8; 32],
    ) -> Result<()> {
        require!(event_id.len() <= MAX_EVENT_ID_LEN, AttestError::EventIdTooLong);
        require!(threat_type.len() <= MAX_THREAT_TYPE_LEN, AttestError::ThreatTypeTooLong);
        require!(severity >= 1 && severity <= 4, AttestError::InvalidSeverity);

        let record = &mut ctx.accounts.attestation;
        record.event_id    = event_id;
        record.threat_type = threat_type;
        record.severity    = severity;
        record.timestamp   = timestamp;
        record.prompt_hash = prompt_hash;
        record.attester    = ctx.accounts.attester.key();
        record.bump        = ctx.bumps.attestation;

        emit!(ThreatAttested {
            event_id:    record.event_id.clone(),
            threat_type: record.threat_type.clone(),
            severity:    record.severity,
            timestamp:   record.timestamp,
            attester:    record.attester,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct AttestThreat<'info> {
    #[account(mut)]
    pub attester: Signer<'info>,

    #[account(
        init,
        payer = attester,
        space = Attestation::space(&event_id),
        seeds = [b"attestation", event_id.as_bytes()],
        bump,
    )]
    pub attestation: Account<'info, Attestation>,

    pub system_program: Program<'info, System>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct Attestation {
    pub event_id:    String,     // max 36 bytes + 4 byte length prefix
    pub threat_type: String,     // max 32 bytes + 4 byte length prefix
    pub severity:    u8,         // 1=low, 2=medium, 3=high, 4=critical
    pub timestamp:   i64,        // unix timestamp
    pub prompt_hash: [u8; 32],   // keccak256 of intercepted prompt
    pub attester:    Pubkey,     // signer authority
    pub bump:        u8,
}

impl Attestation {
    pub fn space(_event_id: &str) -> usize {
        8                                       // discriminator
        + 4 + MAX_EVENT_ID_LEN                  // event_id (String)
        + 4 + MAX_THREAT_TYPE_LEN               // threat_type (String)
        + 1                                     // severity
        + 8                                     // timestamp
        + 32                                    // prompt_hash
        + 32                                    // attester
        + 1                                     // bump
    }
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum AttestError {
    #[msg("Event ID exceeds maximum length of 36 characters")]
    EventIdTooLong,

    #[msg("Threat type exceeds maximum length of 32 characters")]
    ThreatTypeTooLong,

    #[msg("Severity must be 1 (low), 2 (medium), 3 (high), or 4 (critical)")]
    InvalidSeverity,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct ThreatAttested {
    pub event_id: String,
    pub threat_type: String,
    pub severity: u8,
    pub timestamp: i64,
    pub attester: Pubkey,
}
