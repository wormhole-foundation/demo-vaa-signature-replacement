# Wormhole VAA Signature Replacement Tool

This tool helps replace outdated signatures in Wormhole VAAs (Verifiable Action Approvals) using observations from [WormholeScan](https://wormholescan.io/). It ensures VAAs remain valid and can be redeemed even after guardian set changes.

---

## Features

- Fetches VAA IDs from Ethereum transactions
- Retrieves VAA data from WormholeScan
- Validates VAAs using the current guardian set
- Replaces outdated signatures with valid ones
- Sends the updated VAA for verification

---

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
export const RPC = 'https://ethereum-rpc.publicnode.com';
export const CORE = '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'.toLowerCase();
export const LOG_MESSAGE_PUBLISHED_TOPIC =
	'0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2';
export const WORMHOLE_SCAN_API = 'https://api.wormholescan.io/v1';
export const TXS = [
	'0x3ad91ec530187bb2ce3b394d587878cd1e9e037a97e51fbc34af89b2e0719367',
];
```

## Usage

Run the script:

```bash
npm run start
```

## Expected Output

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

## Resources

- [Wormhole Scan API Documentation](https://wormholescan.io/#/developers/api-doc)
- [Wormhole Explorer](https://wormholescan.io/) 
- [Understanding VAAs](https://wormhole.com/docs/learn/infrastructure/vaas/)

## Notes

- This script does not modify VAAs on-chain; it only constructs a valid VAA that can be redeemed.
- If a VAA was never redeemed due to outdated signatures, this tool allows you to generate a valid one for redemption.
