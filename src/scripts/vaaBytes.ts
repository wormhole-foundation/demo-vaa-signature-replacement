import { fetchVaaIds, fetchVaaData } from '../helpers';
import { TXS } from '../config';

async function vaaBytes() {
	try {
		for (const tx of TXS) {
			console.log(
				'\n --------------------------------------------------------------------------------------------------------'
			);
			console.log(`\nProcessing TSX: ${tx}\n`);

			// 1. Fetch Transaction VAA IDs:
			const vaaIds = await fetchVaaIds([tx]);
			if (vaaIds.length === 0 || !vaaIds) continue;

			// 2. Fetch VAA Data:
			const vaaData = await fetchVaaData(vaaIds);
			if (vaaData.length === 0) continue;

			const vaaBytes = vaaData[0].vaaBytes;
			if (!vaaBytes) continue;

			console.log(`VAA Bytes: ${vaaBytes}`);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(`❌ ${error.message}`);
		} else {
			console.error('❌ Unexpected error in main execution:', error);
		}
		process.exit(1);
	}
}

vaaBytes();
