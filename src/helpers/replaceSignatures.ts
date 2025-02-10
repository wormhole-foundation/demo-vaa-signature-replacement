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
		if (currentGuardians.length === 0 || observations.length === 0) {
			console.error('🚨 Cannot continue: Missing required data');
			return;
		}

		// Separate valid and outdated signatures
		const validSigs = observations.filter((sig: any) =>
			currentGuardians.includes(sig.guardianAddr)
		);
		const outdatedSigs = observations.filter(
			(sig: any) => !currentGuardians.includes(sig.guardianAddr)
		);

		console.log(
			`✅ Valid Signatures: ${validSigs.length} | ⚠️  Outdated Signatures: ${outdatedSigs.length}`
		);

		// Convert valid signatures into required format
		const formattedSigs = validSigs.map((sig: any) => {
			const sigBuffer = Buffer.from(sig.signature, 'base64');

			return {
				guardianIndex: currentGuardians.indexOf(sig.guardianAddr),
				signature: new Signature(
					BigInt('0x' + sigBuffer.subarray(0, 32).toString('hex')),
					BigInt('0x' + sigBuffer.subarray(32, 64).toString('hex')),
					sigBuffer[64]
				),
			};
		});

		// Fetch and deserialize the original VAA
		if (!vaa) {
			console.error('🚨 Cannot continue: VAA could not be fetched.');
			return;
		}

		let parsedVaa: VAA<'Uint8Array'>;
		try {
			parsedVaa = deserialize('Uint8Array', vaa);
		} catch (error) {
			console.error('❌ Error deserializing VAA:', error);
			return;
		}

		// Step 1: Identify outdated signatures in the VAA
		const outdatedGuardianIndexes = parsedVaa.signatures
			.filter(
				(vaaSig) => !formattedSigs.some((sig: any) => sig.guardianIndex === vaaSig.guardianIndex)
			)
			.map((sig) => sig.guardianIndex);

		console.log('Outdated Guardian Indexes:', outdatedGuardianIndexes);

		// Step 2: Remove outdated signatures from the original VAA
		let updatedSignatures = parsedVaa.signatures.filter(
			(sig) => !outdatedGuardianIndexes.includes(sig.guardianIndex)
		);

		// Step 3: Pick a valid replacement signature
		const validReplacement = formattedSigs.find(
			(sig: any) =>
				(sig.signature.v === 0 || sig.signature.v === 1) &&
				!updatedSignatures.some((s) => s.guardianIndex === sig.guardianIndex)
		);

		if (validReplacement) {
			updatedSignatures.push(validReplacement);
			console.log('Replaced outdated signature with: ', validReplacement);
		} else {
			console.error('🚨 No valid replacement signature found (must have v = 0 or 1).');
			return;
		}

		// Step 4: Ensure the number of signatures remains the same as original
		if (updatedSignatures.length !== parsedVaa.signatures.length) {
			console.error(
				'🚨 Signature count mismatch! Expected:',
				parsedVaa.signatures.length,
				'Got:',
				updatedSignatures.length
			);
			return;
		}

		// Step 5: Sort signatures by guardian index
		updatedSignatures.sort((a, b) => a.guardianIndex - b.guardianIndex);

		// Step 6: Update the VAA
		const updatedVaa: VAA<'Uint8Array'> = {
			...parsedVaa,
			guardianSet: guardianSetIndex,
			signatures: updatedSignatures,
		};

		// Serialize the updated VAA
		let patchedVaa: Uint8Array;
		try {
			patchedVaa = serialize(updatedVaa);
		} catch (error) {
			console.error('❌ Error serializing updated VAA:', error);
			return;
		}

		// Send the patched VAA to Ethereum RPC
		try {
			// Ensure patchedVaa is a valid Uint8Array
			if (!(patchedVaa instanceof Uint8Array)) {
				throw new Error('🚨 patchedVaa is not a Uint8Array!');
			}

			// Convert Uint8Array to hex string
			const vaaHex = `0x${Buffer.from(patchedVaa).toString('hex')}`;

			console.log('🔍 Sending updated VAA to RPC:');

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

			console.log(`Updated VAA: 0x${Buffer.from(patchedVaa).toString('hex')}`);
			console.log('Full RPC Response:', JSON.stringify(result.data, null, 2));
			console.log(`Verification Result: ${result.data.result}`);
		} catch (error) {
			console.error('❌ Error sending updated VAA to RPC:', error);
		}
	} catch (error) {
		console.error('❌ Unexpected error in replaceSignatures:', error);
	}
}
