use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("RECURXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx"); // replace after first deploy

pub mod constants;
pub mod errors;
pub mod state;

use constants::*;
use errors::RecurError;
use state::*;

#[program]
pub mod recur_staking {
    use super::*;

    /// Initialise the global reward pool and both vaults — called once by protocol authority
    pub fn initialise_pool(
        ctx: Context<InitialisePool>,
        reward_rate: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.reward_pool;
        pool.authority         = ctx.accounts.authority.key();
        pool.reward_mint       = ctx.accounts.reward_mint.key();
        pool.reward_vault      = ctx.accounts.reward_vault.key();
        pool.stake_vault       = ctx.accounts.stake_vault.key();
        pool.reward_rate       = reward_rate;
        pool.total_staked      = 0;
        pool.total_stakers     = 0;
        pool.epoch_start       = Clock::get()?.unix_timestamp;
        pool.pool_bump         = ctx.bumps.reward_pool;
        pool.reward_vault_bump = ctx.bumps.reward_vault;
        pool.stake_vault_bump  = ctx.bumps.stake_vault;

        emit!(PoolInitialised {
            authority:  pool.authority,
            reward_rate,
            timestamp:  pool.epoch_start,
        });

        Ok(())
    }

    /// Stake $RECUR tokens, choosing a lock duration
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        lock: LockDuration,
        auto_compound: bool,
    ) -> Result<()> {
        require!(amount >= MIN_STAKE_NANO, RecurError::InsufficientStake);

        let stake_account = &mut ctx.accounts.stake_account;

        // Enforce per-wallet max stake
        let new_total = stake_account.amount.checked_add(amount)
            .ok_or(RecurError::Overflow)?;
        require!(new_total <= MAX_STAKE, RecurError::ExceedsMaxStake);

        let tier     = NodeTier::from_amount(new_total)?;
        let now      = Clock::get()?.unix_timestamp;
        let is_new   = !stake_account.active; // capture BEFORE we set active = true

        // Transfer tokens from user → stake vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from:      ctx.accounts.user_token_account.to_account_info(),
                to:        ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.staker.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        // If first stake, set staked_at. If topping up, preserve original staked_at
        // so multiplier activation timer is not reset.
        if is_new {
            stake_account.staker        = ctx.accounts.staker.key();
            stake_account.staked_at     = now;
            stake_account.last_claim    = now;
            stake_account.bump          = ctx.bumps.stake_account;
        }

        stake_account.amount        = new_total;
        stake_account.tier          = tier;
        stake_account.lock_duration = lock.to_seconds();
        stake_account.unlock_at     = if lock == LockDuration::Flexible {
            0
        } else {
            now + lock.to_seconds()
        };
        stake_account.auto_compound = auto_compound;
        stake_account.uptime_bps    = 10_000;
        stake_account.active        = true;

        let pool = &mut ctx.accounts.reward_pool;
        pool.total_staked  = pool.total_staked.checked_add(amount)
            .ok_or(RecurError::Overflow)?;
        if is_new {
            pool.total_stakers = pool.total_stakers.checked_add(1)
                .ok_or(RecurError::Overflow)?;
        }

        emit!(NodeStaked {
            staker:    stake_account.staker,
            amount,
            tier:      tier as u8,
            lock:      lock.to_seconds(),
            timestamp: now,
        });

        Ok(())
    }

    /// Unstake — flexible can withdraw anytime, locked must wait until unlock_at
    pub fn unstake(
        ctx: Context<Unstake>,
        amount: u64,
    ) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let now           = Clock::get()?.unix_timestamp;

        require!(
            stake_account.lock_duration == 0 || now >= stake_account.unlock_at,
            RecurError::LockPeriodActive
        );
        require!(stake_account.amount >= amount, RecurError::InsufficientStake);

        // Pay out any pending rewards first
        let pending = calculate_rewards(stake_account, &ctx.accounts.reward_pool, now)?;
        if pending > 0 {
            // FIX: reward_pool is the token authority for reward_vault, not the vault itself
            let pool_bump = ctx.accounts.reward_pool.pool_bump;
            let seeds  = &[b"reward_pool".as_ref(), &[pool_bump]];
            let signer = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.reward_vault.to_account_info(),
                    to:        ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.reward_pool.to_account_info(),
                },
                signer,
            );
            token::transfer(cpi_ctx, pending)?;
            stake_account.last_claim = now;
        }

        // Return staked tokens — reward_pool is also the token authority for stake_vault
        let pool_bump = ctx.accounts.reward_pool.pool_bump;
        let seeds  = &[b"reward_pool".as_ref(), &[pool_bump]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from:      ctx.accounts.stake_vault.to_account_info(),
                to:        ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.reward_pool.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        stake_account.amount = stake_account.amount
            .checked_sub(amount).ok_or(RecurError::Overflow)?;

        if stake_account.amount == 0 {
            stake_account.active = false;
            ctx.accounts.reward_pool.total_stakers =
                ctx.accounts.reward_pool.total_stakers.saturating_sub(1);
        }

        ctx.accounts.reward_pool.total_staked = ctx.accounts.reward_pool
            .total_staked.checked_sub(amount).ok_or(RecurError::Overflow)?;

        emit!(NodeUnstaked {
            staker:    stake_account.staker,
            amount,
            timestamp: now,
        });

        Ok(())
    }

    /// Claim weekly rewards — or auto-compound back into stake
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let now           = Clock::get()?.unix_timestamp;
        let stake_account = &mut ctx.accounts.stake_account;

        require!(stake_account.active, RecurError::NodeInactive);

        let pending = calculate_rewards(stake_account, &ctx.accounts.reward_pool, now)?;
        require!(pending > 0, RecurError::NoPendingRewards);

        let pool_bump = ctx.accounts.reward_pool.pool_bump;

        if stake_account.auto_compound {
            // Enforce max stake cap even when compounding
            let new_total = stake_account.amount.checked_add(pending)
                .ok_or(RecurError::Overflow)?;
            let compound_amount = if new_total > MAX_STAKE {
                MAX_STAKE.checked_sub(stake_account.amount).ok_or(RecurError::Overflow)?
            } else {
                pending
            };

            if compound_amount > 0 {
                // Move rewards from reward_vault → stake_vault (compounding)
                let seeds  = &[b"reward_pool".as_ref(), &[pool_bump]];
                let signer = &[&seeds[..]];
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from:      ctx.accounts.reward_vault.to_account_info(),
                        to:        ctx.accounts.stake_vault.to_account_info(),
                        authority: ctx.accounts.reward_pool.to_account_info(),
                    },
                    signer,
                );
                token::transfer(cpi_ctx, compound_amount)?;
                stake_account.amount = stake_account.amount
                    .checked_add(compound_amount).ok_or(RecurError::Overflow)?;
                ctx.accounts.reward_pool.total_staked = ctx.accounts.reward_pool
                    .total_staked.checked_add(compound_amount).ok_or(RecurError::Overflow)?;
            }

            // Send any overflow rewards (above max stake) directly to wallet
            let overflow = pending.saturating_sub(compound_amount);
            if overflow > 0 {
                let seeds  = &[b"reward_pool".as_ref(), &[pool_bump]];
                let signer = &[&seeds[..]];
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from:      ctx.accounts.reward_vault.to_account_info(),
                        to:        ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.reward_pool.to_account_info(),
                    },
                    signer,
                );
                token::transfer(cpi_ctx, overflow)?;
            }
        } else {
            // Transfer rewards directly to user wallet
            let seeds  = &[b"reward_pool".as_ref(), &[pool_bump]];
            let signer = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.reward_vault.to_account_info(),
                    to:        ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.reward_pool.to_account_info(),
                },
                signer,
            );
            token::transfer(cpi_ctx, pending)?;
        }

        stake_account.last_claim = now;

        emit!(RewardsClaimed {
            staker:     stake_account.staker,
            amount:     pending,
            compounded: stake_account.auto_compound,
            timestamp:  now,
        });

        Ok(())
    }

    /// Slash a node — protocol authority only
    pub fn slash_node(
        ctx: Context<SlashNode>,
        slash_bps: u16,
    ) -> Result<()> {
        require!(slash_bps <= MAX_SLASH_BPS, RecurError::SlashTooHigh);

        let stake_account = &mut ctx.accounts.stake_account;
        let slash_amount  = (stake_account.amount as u128)
            .checked_mul(slash_bps as u128).ok_or(RecurError::Overflow)?
            .checked_div(10_000).ok_or(RecurError::Overflow)? as u64;

        stake_account.amount = stake_account.amount
            .checked_sub(slash_amount).ok_or(RecurError::Overflow)?;
        stake_account.uptime_bps = stake_account.uptime_bps.saturating_sub(slash_bps);

        ctx.accounts.reward_pool.total_staked = ctx.accounts.reward_pool
            .total_staked.checked_sub(slash_amount).ok_or(RecurError::Overflow)?;

        emit!(NodeSlashed {
            staker:       stake_account.staker,
            slash_amount,
            slash_bps,
            timestamp:    Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update node uptime — called by authority each epoch
    pub fn update_uptime(
        ctx: Context<UpdateUptime>,
        uptime_bps: u16,
    ) -> Result<()> {
        require!(uptime_bps <= 10_000, RecurError::InvalidUptime);
        ctx.accounts.stake_account.uptime_bps = uptime_bps;
        Ok(())
    }
}

// ── Reward calculation ────────────────────────────────────────────────────────

fn calculate_rewards(
    stake_account: &StakeAccount,
    pool: &RewardPool,
    now: i64,
) -> Result<u64> {
    let elapsed = now.saturating_sub(stake_account.last_claim) as u64;
    if elapsed == 0 || pool.total_staked == 0 { return Ok(0); }

    let elapsed_weeks = elapsed / EPOCH_SECONDS;
    if elapsed_weeks == 0 { return Ok(0); }

    // APY based on lock duration
    let apy_bps = match stake_account.lock_duration {
        0                        => APY_FLEXIBLE as u128,
        l if l == LOCK_3_MONTHS  => APY_3_MONTHS as u128,
        l if l == LOCK_6_MONTHS  => APY_6_MONTHS as u128,
        l if l == LOCK_12_MONTHS => APY_12_MONTHS as u128,
        _                        => APY_FLEXIBLE as u128,
    };

    // Tier multiplier — activates after 3 months
    let multiplier = stake_account.tier.multiplier_bps(stake_account.staked_at, now) as u128;

    // reward = amount * APY_bps * multiplier * elapsed_weeks / (52 * 10_000 * 10_000)
    let reward = (stake_account.amount as u128)
        .checked_mul(apy_bps).ok_or(RecurError::Overflow)?
        .checked_mul(multiplier).ok_or(RecurError::Overflow)?
        .checked_mul(elapsed_weeks).ok_or(RecurError::Overflow)?
        .checked_div(52 * 10_000 * 10_000).ok_or(RecurError::Overflow)? as u64;

    Ok(reward)
}

// ── Account Contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitialisePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init, payer = authority, space = RewardPool::LEN,
        seeds = [b"reward_pool"], bump,
    )]
    pub reward_pool: Account<'info, RewardPool>,

    pub reward_mint: Account<'info, token::Mint>,

    #[account(
        init, payer = authority,
        token::mint = reward_mint,
        token::authority = reward_pool,
        seeds = [b"reward_vault"], bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        init, payer = authority,
        token::mint = reward_mint,
        token::authority = reward_pool,
        seeds = [b"stake_vault"], bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent:           Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        init_if_needed, payer = staker, space = StakeAccount::LEN,
        seeds = [b"stake_account", staker.key().as_ref()], bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, seeds = [b"reward_pool"], bump = reward_pool.pool_bump)]
    pub reward_pool: Account<'info, RewardPool>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"stake_vault"], bump = reward_pool.stake_vault_bump)]
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent:           Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(mut, seeds = [b"stake_account", staker.key().as_ref()], bump = stake_account.bump)]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, seeds = [b"reward_pool"], bump = reward_pool.pool_bump)]
    pub reward_pool: Account<'info, RewardPool>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"stake_vault"], bump = reward_pool.stake_vault_bump)]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"reward_vault"], bump = reward_pool.reward_vault_bump)]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(mut, seeds = [b"stake_account", staker.key().as_ref()], bump = stake_account.bump)]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, seeds = [b"reward_pool"], bump = reward_pool.pool_bump)]
    pub reward_pool: Account<'info, RewardPool>,

    #[account(mut, seeds = [b"reward_vault"], bump = reward_pool.reward_vault_bump)]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"stake_vault"], bump = reward_pool.stake_vault_bump)]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SlashNode<'info> {
    #[account(mut, constraint = authority.key() == reward_pool.authority)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut, seeds = [b"reward_pool"], bump = reward_pool.pool_bump)]
    pub reward_pool: Account<'info, RewardPool>,
}

#[derive(Accounts)]
pub struct UpdateUptime<'info> {
    #[account(constraint = authority.key() == reward_pool.authority)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(seeds = [b"reward_pool"], bump = reward_pool.pool_bump)]
    pub reward_pool: Account<'info, RewardPool>,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event] pub struct PoolInitialised { pub authority: Pubkey, pub reward_rate: u64, pub timestamp: i64 }
#[event] pub struct NodeStaked      { pub staker: Pubkey, pub amount: u64, pub tier: u8, pub lock: i64, pub timestamp: i64 }
#[event] pub struct NodeUnstaked    { pub staker: Pubkey, pub amount: u64, pub timestamp: i64 }
#[event] pub struct RewardsClaimed  { pub staker: Pubkey, pub amount: u64, pub compounded: bool, pub timestamp: i64 }
#[event] pub struct NodeSlashed     { pub staker: Pubkey, pub slash_amount: u64, pub slash_bps: u16, pub timestamp: i64 }
