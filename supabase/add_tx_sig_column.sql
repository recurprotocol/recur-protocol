-- Add tx_sig column to store Solana transaction signatures for on-chain attestations
-- Run this in the Supabase SQL Editor manually

alter table api_keys add column if not exists tx_sig text;

-- If you have a separate threat_events table, add it there too:
-- alter table threat_events add column if not exists tx_sig text;
-- alter table threat_events add column if not exists event_id text;
