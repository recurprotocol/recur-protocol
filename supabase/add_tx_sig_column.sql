-- Add on-chain attestation columns to threat_events table
-- Run this in the Supabase SQL Editor manually

ALTER TABLE threat_events
ADD COLUMN IF NOT EXISTS tx_sig text,
ADD COLUMN IF NOT EXISTS network text DEFAULT 'devnet';
