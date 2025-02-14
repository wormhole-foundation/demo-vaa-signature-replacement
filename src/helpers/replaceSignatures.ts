import axios from 'axios';
import { deserialize, serialize, VAA, Signature } from '@wormhole-foundation/sdk';
import { eth } from 'web3';
import { RPC, CORE, PARSE_AND_VERIFY_VM_ABI } from '../config';

export async function replaceSignatures(
	vaa: string | Uint8Array<ArrayBufferLike>,
	observations: { guardianAddr: string; signature: string }[],
	currentGuardians: string[],
	guardianSetIndex: number
) {
	console.log('🔄 Replacing Signatures...');

	try {
		// Step 1: Validate input data
		if (!vaa) throw new Error('VAA is undefined or empty.');
		if (currentGuardians.length === 0) throw new Error('Guardian set is empty.');
		if (observations.length === 0) throw new Error('No observations provided.');

		// Step 2: Separate valid and outdated signatures
		const validSigs = observations.filter((sig) => currentGuardians.includes(sig.guardianAddr));
		const outdatedSigs = observations.filter((sig) => !currentGuardians.includes(sig.guardianAddr));

		console.log(
			`✅ Valid Signatures: ${validSigs.length} | ⚠️  Outdated Signatures: ${outdatedSigs.length}`
		);

		if (validSigs.length === 0) throw new Error('No valid signatures found. Cannot proceed.');

		// Step 3: Convert valid signatures
		const formattedSigs = validSigs
			.map((sig) => {
				try {
					const sigBuffer = Buffer.from(sig.signature, 'base64');

					return {
						guardianIndex: currentGuardians.indexOf(sig.guardianAddr),
						signature: new Signature(
							BigInt('0x' + sigBuffer.subarray(0, 32).toString('hex')),
							BigInt('0x' + sigBuffer.subarray(32, 64).toString('hex')),
							sigBuffer[64]
						),
					};
				} catch (error) {
					console.error(`❌ Failed to process signature for guardian: ${sig.guardianAddr}`, error);
					return null;
				}
			})
			.filter(Boolean); // Remove any failed conversions

		// Step 4: Deserialize the original VAA
		let parsedVaa: VAA<'Uint8Array'>;
		try {
			parsedVaa = deserialize('Uint8Array', vaa);
		} catch (error) {
			throw new Error(`Error deserializing VAA: ${error}`);
		}

		// Step 5: Identify outdated signatures
		const outdatedGuardianIndexes = parsedVaa.signatures
			.filter(
				(vaaSig) => !formattedSigs.some((sig: any) => sig.guardianIndex === vaaSig.guardianIndex)
			)
			.map((sig) => sig.guardianIndex);

		console.log('⚠️  Outdated Guardian Indexes:', outdatedGuardianIndexes);

		// Step 6: Remove outdated signatures
		let updatedSignatures = parsedVaa.signatures.filter(
			(sig) => !outdatedGuardianIndexes.includes(sig.guardianIndex)
		);

		// Step 7: Pick a valid replacement signature
		const validReplacement = formattedSigs.find(
			(sig: any) =>
				(sig.signature.v === 0 || sig.signature.v === 1) &&
				!updatedSignatures.some((s) => s.guardianIndex === sig.guardianIndex)
		);

		if (!validReplacement)
			throw new Error('No valid replacement signature found (must have v = 0 or 1).');

		updatedSignatures.push(validReplacement);

		// Step 8: Sort signatures
		updatedSignatures.sort((a, b) => a.guardianIndex - b.guardianIndex);

		// Step 9: Update and serialize VAA
		const updatedVaa: VAA<'Uint8Array'> = {
			...parsedVaa,
			guardianSet: guardianSetIndex,
			signatures: updatedSignatures,
		};
		let patchedVaa: Uint8Array;
		try {
			patchedVaa = serialize(updatedVaa);
		} catch (error) {
			throw new Error(`Error serializing updated VAA: ${error}`);
		}

		// Step 10: Send the updated VAA to RPC
		try {
			if (!(patchedVaa instanceof Uint8Array)) throw new Error('Patched VAA is not a Uint8Array!');

			const vaaHex = `0x${Buffer.from(patchedVaa).toString('hex')}`;

			console.log('Sending updated VAA to RPC...');

			const result = await axios.post(RPC, {
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_call',
				params: [
					{
						from: null,
						to: CORE,
						data: eth.abi.encodeFunctionCall(PARSE_AND_VERIFY_VM_ABI, [vaaHex]),
					},
					'latest',
				],
			});

			const rpcResponse = JSON.stringify(result.data, null, 2);
			const verificationResult = result.data.result;
			// console.log(`Updated VAA: 0x${Buffer.from(patchedVaa).toString('hex')}`);
			// console.log('📡 Full RPC Response:', JSON.stringify(result.data, null, 2));
			// console.log(`Verification Result: ${result.data.result}`);
			return verificationResult;
		} catch (error) {
			throw new Error(`Error sending updated VAA to RPC: ${error}`);
		}
	} catch (error) {
		console.error('❌ Unexpected error in replaceSignatures:', error);
	}
}
