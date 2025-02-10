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
	console.log('🔍 Fetching VAA IDs...');
	const vaaIds = await fetchVaaIds(TXS);
	console.log('✅ VAA IDs:', vaaIds);

	if (vaaIds.length === 0) {
		console.error('🚨 No VAA IDs found. Exiting.');
		return;
	}

	console.log('🔍 Fetching VAA Data...');
	const vaaData = await fetchVaaData(vaaIds);
	console.log('✅ VAA Data:', vaaData);

	if (vaaData.length === 0) {
		console.error('🚨 No VAA data found. Exiting.');
		return;
	}

	const vaaBytes = vaaData[0].vaaBytes;

	console.log('🔍 Checking VAA Validity...');
	const { valid, reason } = await checkVaaValidity(vaaBytes);
	console.log(`✅ VAA Valid: ${valid}, Reason: ${reason}`);

	if (!valid) {
		console.log('🔍 Fetching Observations...');
		const observations = await fetchObservations(vaaIds[0]); // Pass the first VAA ID
		console.log('✅ Observations:', observations);

		console.log('🔍 Fetching Guardian Set...');
		const [currentGuardians, guardianSetIndex] = await fetchGuardianSet();
		console.log('✅ Guardian Set:', currentGuardians);

		if (!vaaBytes) {
			console.error('🚨 Error: VAA bytes are undefined.');
			return;
		}

		console.log('🔄 Replacing Signatures...');
		const patchedVaa = await replaceSignatures(
			Buffer.from(vaaBytes, 'base64'),
			observations,
			currentGuardians,
			guardianSetIndex
		);
		// console.log('✅ Signature Replacement Completed.');
		// console.log('Patched VAA: ', patchedVaa);
	}
}

main().catch(console.error);
