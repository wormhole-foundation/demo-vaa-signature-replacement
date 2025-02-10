import {
	fetchVaaIds,
	fetchVaaData,
	checkVaaValidity,
	fetchObservations,
	fetchGuardianSet,
	replaceSignatures,
} from './helpers';
import { TXS } from './config';

async function main() {
	try {
		// 1. Fetch Transaction VAA IDs:
		const vaaIds = await fetchVaaIds(TXS);
		if (vaaIds.length === 0) throw new Error('🚨 No VAA IDs found.');

		// 2. Fetch VAA Data:
		const vaaData = await fetchVaaData(vaaIds);
		if (vaaData.length === 0) throw new Error('🚨 No VAA data found.');

		const vaaBytes = vaaData[0].vaaBytes;
		if (!vaaBytes) throw new Error('🚨 VAA bytes are undefined.');

		// 3. Check VAA Validity:
		const { valid } = await checkVaaValidity(vaaBytes);
		if (valid) {
			console.log('✅ VAA is already valid. No further action needed.');
			return;
		}

		console.log('⚠ VAA is not valid, proceeding with signature replacement...');

		// 4. Fetch Observations (VAA signatures):
		const observations = await fetchObservations(vaaIds[0]);

		// 5. Fetch Current Guardian Set:
		const [currentGuardians, guardianSetIndex] = await fetchGuardianSet();

		// 6. Replace Signatures:
		const patchedVaa = await replaceSignatures(
			Buffer.from(vaaBytes, 'base64'),
			observations,
			currentGuardians,
			guardianSetIndex
		);

		return patchedVaa;
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
