# RECUR Staking Program

Solana staking contract for RECUR Protocol sentinel node operators.

Built with [Anchor](https://www.anchor-lang.com/) framework.

## Overview

The RECUR staking program allows $RECUR token holders to stake and earn rewards. Stakers choose a lock duration to maximise their APY, with flexible withdrawal available on the no-lock tier.

## Node Tiers

| Tier  | Minimum Stake  | Multiplier | Slots      |
|-------|---------------|------------|------------|
| NANO  | 1,000 $RECUR  | 1.0x       | Unlimited  |
| WARD  | 10,000 $RECUR | 1.75x      | 500        |
| PRIME | 50,000 $RECUR | 2.75x      | 50         |

## Lock Durations & APY

| Lock Period | APY  | Early Exit |
|-------------|------|------------|
| Flexible    | 8%   | Anytime    |
| 3 Months    | 12%  | Locked     |
| 6 Months    | 16%  | Locked     |
| 12 Months   | 20%  | Locked     |

## Instructions

| Instruction        | Description                                           |
|--------------------|-------------------------------------------------------|
| `initialise_pool`  | One-time protocol setup — creates reward and stake vaults |
| `stake`            | Lock $RECUR to register as a sentinel node operator   |
| `unstake`          | Withdraw flexible stake or locked stake after expiry  |
| `claim_rewards`    | Claim weekly $RECUR rewards (or auto-compound)        |
| `slash_node`       | Protocol authority slashes node for downtime (max 20%)|
| `update_uptime`    | Authority updates node uptime score each epoch        |

## Reward Mechanics

Rewards are distributed weekly every Sunday 12:00 UTC:
```
reward = amount * APY * elapsed_weeks / 52
```

- **Token:** $RECUR staked to earn $RECUR
- **Reward pool:** funded at launch by protocol treasury
- **Auto-compound:** opt-in per user — reinvests rewards back into stake
- **Flexible tier:** withdraw anytime, no penalty
- **Locked tiers:** tokens are fully locked until expiry

## Development
```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest

# Build
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

## Status

- [x] Program architecture
- [x] Core instructions (stake, unstake, claim, slash)
- [x] Lock duration tiers with variable APY
- [x] Auto-compounding
- [ ] Security audit
- [ ] Devnet deployment
- [ ] Mainnet launch
