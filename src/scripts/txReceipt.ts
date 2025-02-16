import axios from 'axios';
import { TXS } from '../config';
import { RPC, CORE, LOG_MESSAGE_PUBLISHED_TOPIC } from '../config';

async function fetchVaaIds() {
	const vaaIds = [];
	for (const tx of TXS) {
		const result = (
			await axios.post(RPC, {
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_getTransactionReceipt',
				params: [tx],
			})
		)?.data?.result;
		if (!result) {
			console.error(`❌ ${tx} - Unable to fetch transaction receipt`);
			continue;
		}
		for (const log of result.logs) {
			if (log.address === CORE && log.topics?.[0] === LOG_MESSAGE_PUBLISHED_TOPIC) {
				const emitter = log.topics[1].substring(2);
				const seq = BigInt(log.data.substring(0, 66)).toString();
				console.log(`${tx} - 2/${emitter}/${seq}`);
			}
		}
	}
}

fetchVaaIds();
