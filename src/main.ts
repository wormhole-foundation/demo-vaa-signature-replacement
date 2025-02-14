import {
	fetchVaaIds,
	fetchVaaData,
	checkVaaValidity,
	fetchObservations,
	fetchGuardianSet,
	replaceSignatures,
	decodeResponse,
} from './helpers';
import { TXS } from './config';

async function main() {
	try {
		for (const tx of TXS) {
			console.log('\nProcessing TSX: ', tx);

			// 1. Fetch Transaction VAA IDs:
			const vaaIds = await fetchVaaIds([tx]);
			if (vaaIds.length === 0) continue;

			// 2. Fetch VAA Data:
			const vaaData = await fetchVaaData(vaaIds);
			if (vaaData.length === 0) continue;

			const vaaBytes = vaaData[0].vaaBytes;
			if (!vaaBytes) continue;

			// 3. Check VAA Validity:
			const { valid } = await checkVaaValidity(vaaBytes);
			if (valid) continue;

			// 4. Fetch Observations (VAA signatures):
			const observations = await fetchObservations(vaaIds[0]);

			// 5. Fetch Current Guardian Set:
			const [currentGuardians, guardianSetIndex] = await fetchGuardianSet();

			// 6. Replace Signatures:
			const response = await replaceSignatures(
				Buffer.from(vaaBytes, 'base64'),
				observations,
				currentGuardians,
				guardianSetIndex
			);

			if (!response) continue;

			// 7. Decode Response:
			await decodeResponse(response);
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

main();
