import { wormhole, deserialize } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import { fetchVaaIds, fetchVaaData, fetchSolanaVaaIds } from '../helpers';
import { TXS } from '../config';

type ChainType = 'Ethereum' | 'Solana';
const srcChain: ChainType = 'Ethereum';
const destChain: ChainType = 'Solana';

async function checkTransferCompleted(srcChain: ChainType, destChain: ChainType) {
	const wh = await wormhole('Mainnet', [evm, solana, sui]);
	const chain = wh.getChain(destChain);
	const tokenBridge = await chain.getTokenBridge();

	for (const tx of TXS) {
		try {
			console.log(
				'\n --------------------------------------------------------------------------------------------------------'
			);
			console.log(`\nProcessing TSX: ${tx}\n`);

			// 1. Fetch Transaction VAA IDs:
			const vaaIds =
				srcChain === 'Solana' ? await fetchSolanaVaaIds([tx]) : await fetchVaaIds([tx]);
			if (vaaIds.length === 0 || !vaaIds) continue;

			// 2. Fetch VAA Data:
			const vaaData = await fetchVaaData(vaaIds);
			if (vaaData.length === 0) continue;

			const v = vaaData[0].vaaBytes;
			if (!v) continue;

			// 3. Convert base64 string to Uint8Array
			const vaaBytes = Buffer.from(v, 'base64');

			// 4. Deserialize vaa
			const parsedVaa = deserialize('TokenBridge:Transfer', vaaBytes);

			// 5. Check transfer status
			const transactionCheck = await tokenBridge.isTransferCompleted(parsedVaa);

			console.log('Transfer Status:', transactionCheck);
		} catch (error) {
			console.error('Error processing VAA:', error);
		}
	}
}

checkTransferCompleted(srcChain, destChain);
