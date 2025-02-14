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

		if (validSigs.length === 0) throw new Error('No valid signatures found. Cannot proceed.');

		// Step 3: Convert valid signatures
		const formattedSigs = validSigs
			.map((sig) => {
				try {
					const sigBuffer = Buffer.from(sig.signature, 'base64');
					// If it's 130 bytes, it's hex-encoded and needs conversion
					const sigBuffer1 =
						sigBuffer.length === 130 ? Buffer.from(sigBuffer.toString(), 'hex') : sigBuffer;

					const r = BigInt('0x' + sigBuffer1.subarray(0, 32).toString('hex'));
					const s = BigInt('0x' + sigBuffer1.subarray(32, 64).toString('hex'));
					const vRaw = sigBuffer1[64];
					const v = vRaw < 27 ? vRaw : vRaw - 27;

					return {
						guardianIndex: currentGuardians.indexOf(sig.guardianAddr),
						signature: new Signature(r, s, v),
					};
				} catch (error) {
					console.error(`❌ Failed to process signature for guardian: ${sig.guardianAddr}`, error);
					return null;
				}
			})
			.filter((sig): sig is { guardianIndex: number; signature: Signature } => sig !== null); // ✅ Remove null values

		// Step 4: Deserialize the original VAA
		let parsedVaa: VAA<'Uint8Array'>;
		try {
			parsedVaa = deserialize('Uint8Array', vaa);
		} catch (error) {
			throw new Error(`Error deserializing VAA: ${error}`);
		}

		// Step 5: Identify outdated signatures in the VAA
		const outdatedGuardianIndexes = parsedVaa.signatures
			.filter((vaaSig) => !formattedSigs.some((sig) => sig.guardianIndex === vaaSig.guardianIndex))
			.map((sig) => sig.guardianIndex);

		console.log('⚠️  Outdated Guardian Indexes:', outdatedGuardianIndexes);

		// Step 6: Remove outdated signatures
		let updatedSignatures = parsedVaa.signatures.filter(
			(sig) => !outdatedGuardianIndexes.includes(sig.guardianIndex)
		);

		// ✅ **Fix: Find the right replacements**
		const validReplacements = formattedSigs.filter(
			(sig) => !updatedSignatures.some((s) => s.guardianIndex === sig.guardianIndex)
		);

		// 🚨 **NEW: Check if we have enough valid signatures to replace outdated ones**
		if (outdatedGuardianIndexes.length > validReplacements.length) {
			console.warn(
				`🚨 Not enough valid replacement signatures! Need ${outdatedGuardianIndexes.length}, but only ${validReplacements.length} available.`
			);
			return;
		}

		// ✅ Ensure replacements are added
		updatedSignatures = [
			...updatedSignatures,
			...validReplacements.slice(0, outdatedGuardianIndexes.length),
		];

		// Step 7: Sort signatures by guardian index
		updatedSignatures.sort((a, b) => a.guardianIndex - b.guardianIndex);

		// Step 8: Update and serialize VAA
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

		// Step 9: Send the updated VAA to RPC
		try {
			if (!(patchedVaa instanceof Uint8Array)) throw new Error('Patched VAA is not a Uint8Array!');

			const vaaHex = `0x${Buffer.from(patchedVaa).toString('hex')}`;

			console.log('📡 Sending updated VAA to RPC...');

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

			const verificationResult = result.data.result;
			return verificationResult;
		} catch (error) {
			throw new Error(`Error sending updated VAA to RPC: ${error}`);
		}
	} catch (error) {
		console.error('❌ Unexpected error in replaceSignatures:', error);
	}
}
