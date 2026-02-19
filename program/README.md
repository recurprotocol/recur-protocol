# RECUR Staking Program

Solana staking contract for RECUR Protocol sentinel node operators.

Built with [Anchor](https://www.anchor-lang.com/) framework.

## Overview

The RECUR staking program allows $RECUR token holders to stake and operate sentinel detection nodes. Stakers earn rewards proportional to their stake tier, node uptime, and threats processed.

## Node Tiers

| Tier  | Minimum Stake  | Est. APY | Multiplier | Slots      |
|-------|---------------|----------|------------|------------|
| NANO  | 1,000 $RECUR  | ~8%      | 1.0x       | Unlimited  |
| WARD  | 10,000 $RECUR | ~14%     | 1.75x      | 500        |
| PRIME | 50,000 $RECUR | ~22%     | 2.75x      | 50         |

## Instructions

| Instruction        | Description                                              |
|--------------------|----------------------------------------------------------|
| `initialise_pool`  | One-time protocol setup — creates reward pool            |
| `stake`            | Lock $RECUR to register as a sentinel node operator      |
| `unstake`          | Withdraw staked tokens after 7-day lock period           |
| `claim_rewards`    | Claim accumulated $RECUR rewards                         |
| `slash_node`       | Protocol authority slashes node for downtime (max 20%)   |
| `update_uptime`    | Authority updates node uptime score each epoch           |

## Reward Mechanics

Rewards are distributed per Solana epoch (~2 days):

```
reward = (stake / total_staked) * reward_rate * elapsed_epochs * tier_multiplier * uptime_factor
```

- **Reward pool**: 30% of total $RECUR supply, locked at launch
- **Lock period**: 7 days minimum before unstaking
- **Slash condition**: Nodes with sustained downtime can be slashed up to 20%
- **Uptime tracking**: Authority updates uptime score after each epoch

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
- [x] Tier system and reward calculation
- [ ] Security audit
- [ ] Devnet deployment
- [ ] Mainnet launch
