import {
	fetchVaaIds,
	fetchVaaData,
	checkVaaValidity,
	fetchObservations,
	fetchGuardianSet,
	replaceSignatures,
} from './helpers';

// Example transaction hashes to check
const TXS = ['0x3ad91ec530187bb2ce3b394d587878cd1e9e037a97e51fbc34af89b2e0719367'];

async function main() {
	// 1. Fetch Transaction VAA IDs:
	const vaaIds = await fetchVaaIds(TXS);

	if (vaaIds.length === 0) {
		console.error('🚨 No VAA IDs found. Exiting.');
		return;
	}

	// 2. Fetch VAA Data:
	const vaaData = await fetchVaaData(vaaIds);

	if (vaaData.length === 0) {
		console.error('🚨 No VAA data found. Exiting.');
		return;
	}

	const vaaBytes = vaaData[0].vaaBytes;

	// 3. Check VAA Validity:
	const { valid } = await checkVaaValidity(vaaBytes);

	// If VAA is not valid:
	if (!valid) {
		// 4. Fetch Observations (VAA signatures):
		const observations = await fetchObservations(vaaIds[0]); // Pass the first VAA ID

		// 5. Fetch Current Guardian Set:
		const [currentGuardians, guardianSetIndex] = await fetchGuardianSet();

		if (!vaaBytes) {
			console.error('🚨 Error: VAA bytes are undefined.');
			return;
		}

		// 6. Replace Signatures:
		const patchedVaa = await replaceSignatures(
			Buffer.from(vaaBytes, 'base64'),
			observations,
			currentGuardians,
			guardianSetIndex
		);
	}
}

main().catch(console.error);
