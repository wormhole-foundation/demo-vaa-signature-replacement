import axios from 'axios';
import { RPC, CORE, LOG_MESSAGE_PUBLISHED_TOPIC } from '../config/constants';

// Function to fetch VAA IDs from Ethereum transaction receipts
export async function fetchVaaIds(txHashes: string[]): Promise<string[]> {
	const vaaIds: string[] = [];

	for (const tx of txHashes) {
		try {
			const result = (
				await axios.post(RPC, {
					jsonrpc: '2.0',
					id: 1,
					method: 'eth_getTransactionReceipt',
					params: [tx],
				})
			).data.result;

			if (!result) throw new Error(`Unable to fetch transaction receipt for ${tx}`);

			for (const log of result.logs) {
				if (log.address === CORE && log.topics?.[0] === LOG_MESSAGE_PUBLISHED_TOPIC) {
					const emitter = log.topics[1].substring(2);
					const seq = BigInt(log.data.substring(0, 66)).toString();
					vaaIds.push(`2/${emitter}/${seq}`);
				}
			}
		} catch (error) {
			console.error(`❌ Error processing ${tx}:`, error);
		}
	}

	return vaaIds;
}
