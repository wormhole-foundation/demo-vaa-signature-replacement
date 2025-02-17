# Wormhole VAA Signature Replacement & Validation Tool

This tool facilitates handling Wormhole Verifiable Action Approvals (VAAs) by:

- Fetching VAA data from [WormholeScan](<(https://wormholescan.io/)>)
- Validating VAAs using the current guardian set
- Replacing outdated signatures with valid ones
- Checking redemption status of VAAs

---

## Features

- Fetches VAA IDs from Ethereum and Solana transactions
- Retrieves VAA data from WormholeScan
- Validates VAA signatures using the latest guardian set
- Replaces outdated signatures and constructs a valid VAA
- Checks VAA redemption status (whether a transaction has been redeemed)
- Converts VAAs into byte format for verification

---

## Project Structure

```text
wormhole-scan-api-demo/
│── src/
│   ├── config/
│   │   ├── constants.ts
│   │   ├── index.ts
│   │   ├── layouts.ts
│   ├── helpers/
│   │   ├── checkVaaValidity.ts
│   │   ├── fetchGuardianSet.ts
│   │   ├── fetchObservations.ts
│   │   ├── fetchVaaData.ts
│   │   ├── fetchVaaIds.ts
│   │   ├── replaceSignatures.ts
│   │   ├── responseDecoder.ts
│   ├── scripts/
│   │   ├── checkRedeem.ts
│   │   ├── replaceSignatures.ts
│   │   ├── txReceipt.ts
│   │   ├── vaaBytes.ts
│── .gitignore
│── package.json
│── README.md
│── tsconfig.json
```

## Installation

```sh
git clone https://github.com/martin0995/wormhole-scan-api-demo.git
cd wormhole-scan-api-demo
npm install
```

## Configuration

All configuration values are stored in:

```bash
src/config/constants.ts
```

Example:

```bash
// RPC endpoints:
export const RPC = 'https://ethereum-rpc.publicnode.com';
export const RPC_SOL = 'https://solana-rpc.publicnode.com';

// Wormhole Core contracts:
export const CORE = '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'.toLowerCase();

// Solana Emitter Address:
export const SOL_EMITTER_ADDRESS =
	'ec7372995d5cc8732397fb0ad35c0121e0eaa90d26f828a534cab54391b3a4f5';
export const LOG_MESSAGE_PUBLISHED_TOPIC =
	'0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2';

// WormholeScan API endpoint:
export const WORMHOLE_SCAN_API = 'https://api.wormholescan.io/v1';

// Example Transactions:
export const TXS = [
	'0x3ad91ec530187bb2ce3b394d587878cd1e9e037a97e51fbc34af89b2e0719367',
	'0x3c989a6bb40dcd4719453fbe7bbac420f23962c900ae75793124fc9cc614368c',
	'0x5bc2a92f713d8fa99bf3225ba30bb0f8cd375436cea9852d0f345d966dcca400',
	'0xc43744bd3730808421df1703a2a1a6e2f7218290f1b9748825e529156689a684',
	'0x98524be4dcf8a485e9a155d823fa07829aebf68365285ccfc26a9d48e8476d57',
	'0x8edd3b78dbaab790ff1e2ce6525014e0e332f5fbbc4699d2638e874cf4ef00e4',
	'0x5bd504ac240ddf51894bf92f5a696a4761ffa104eb7261c506e8180d9fcff65c',
];

export const SOL_TXS = [
	'66BXU1ahyzaEW8q7Cp3M92myAQegs8v74WgT2gpQK6Cap9WRubbQrorpz2taBDchWdDraZiwpPab9vfvYesnvXHV',
	'3b43sxyV9cXKaNfxoadnwrFu7fZtsjjVnhZ7KPz4xdhFmTa5PfENQ9fBt559sTQuFMtakeXx5qo2e7TFGn19v3rc',
];

```

## Usage

1. **Check VAA Signatures & Replace Invalid Ones** - verifies if a VAA’s signatures are valid. If invalid, replaces outdated signatures and constructs a valid VAA

```bash
npm run vaa:replace-signatures
```

If the script successfully replaces outdated signatures and the VAA is valid, the RPC response will return:

```bash
✅ Verification Result: true
```

If the VAA is still invalid, the RPC response will return:

```bash
❌ Verification Result: false
```

If the number of outdated signatures is greater than the number of available valid signatures for replacement, the script will exit early, logging a warning:

```bash
Not enough valid replacement signatures! Need X, but only Y available.
Exiting program...
```

2. **Fetch VAA IDs** - extracts VAA IDs from a list of Ethereum transaction hashes

```bash
npm run vaa:tx-ids
```

3. **Convert VAA to Bytes** - fetches a VAA from WormholeScan and converts it to byte format

```bash
npm run vaa:bytes
```

4. **Check VAA Redemption Status** - verifies whether a VAA has been redeemed or not. Returns `true` (redeemed) or `false` (not redeemed). Supports only Ethereum ↔ Solana transactions on Mainnet

Before running the redemption script, users must manually input the source and destination chain inside the script.

```typescript
const srcChain: ChainType = 'Ethereum'; // or 'Solana'
const destChain: ChainType = 'Solana'; // or 'Ethereum'
```

Then, run:

```bash
npm run vaa:redeem-status
```

## Resources

- [Wormhole Scan API Documentation](https://wormholescan.io/#/developers/api-doc)
- [Wormhole Explorer](https://wormholescan.io/)
- [Understanding VAAs](https://wormhole.com/docs/learn/infrastructure/vaas/)

## Notes

- This script does not modify VAAs on-chain; it only constructs a valid VAA that can be redeemed.
- If a VAA was never redeemed due to outdated signatures, this tool allows you to generate a valid one for redemption.
