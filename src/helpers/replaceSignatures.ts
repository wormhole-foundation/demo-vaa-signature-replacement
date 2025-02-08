import axios from 'axios';
import { deserialize, serialize, VAA, Signature } from '@wormhole-foundation/sdk';
import { eth } from 'web3';

const WORMHOLE_SCAN_API = 'https://api.wormholescan.io/v1';
const RPC = 'https://ethereum-rpc.publicnode.com';
const CORE = '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'.toLowerCase();

const PARSE_AND_VERIFY_VM_ABI = {
	inputs: [{ internalType: 'bytes', name: 'encodedVM', type: 'bytes' }],
	name: 'parseAndVerifyVM',
	outputs: [
		{
			components: [
				{ internalType: 'uint8', name: 'version', type: 'uint8' },
				{ internalType: 'uint32', name: 'timestamp', type: 'uint32' },
				{ internalType: 'uint32', name: 'nonce', type: 'uint32' },
				{ internalType: 'uint16', name: 'emitterChainId', type: 'uint16' },
				{ internalType: 'bytes32', name: 'emitterAddress', type: 'bytes32' },
				{ internalType: 'uint64', name: 'sequence', type: 'uint64' },
				{ internalType: 'uint8', name: 'consistencyLevel', type: 'uint8' },
				{ internalType: 'bytes', name: 'payload', type: 'bytes' },
				{ internalType: 'uint32', name: 'guardianSetIndex', type: 'uint32' },
				{
					components: [
						{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
						{ internalType: 'bytes32', name: 's', type: 'bytes32' },
						{ internalType: 'uint8', name: 'v', type: 'uint8' },
						{ internalType: 'uint8', name: 'guardianIndex', type: 'uint8' },
					],
					internalType: 'struct Structs.Signature[]',
					name: 'signatures',
					type: 'tuple[]',
				},
				{ internalType: 'bytes32', name: 'hash', type: 'bytes32' },
			],
			internalType: 'struct Structs.VM',
			name: 'vm',
			type: 'tuple',
		},
		{ internalType: 'bool', name: 'valid', type: 'bool' },
		{ internalType: 'string', name: 'reason', type: 'string' },
	],
	stateMutability: 'view',
	type: 'function',
};

// ✅ Fetch current guardian set
async function fetchGuardianSet() {
	try {
		console.log('🛠 Fetching current guardian set...');
		const response = await axios.get(`${WORMHOLE_SCAN_API}/guardianset/current`);
		// console.log('✅ Guardian set fetched:', response.data);

		const guardians = response.data.guardianSet.addresses.map((addr: string) => addr.toLowerCase());
		const guardianSet = response.data.guardianSet.index;
		return [guardians, guardianSet];
	} catch (error) {
		console.error('❌ Error fetching guardian set:', error);
		return [];
	}
}

// ✅ Fetch signatures (observations)
async function fetchObservations(vaaId: string) {
	try {
		console.log(`🛠 Fetching observations for: ${vaaId}`);
		const response = await axios.get(`https://api.wormholescan.io/api/v1/observations/${vaaId}`);
		// console.log('✅ Observations fetched:', response.data);
		return response.data.map((obs: any) => ({
			guardianAddr: obs.guardianAddr.toLowerCase(),
			signature: obs.signature,
		}));
	} catch (error) {
		console.error(`❌ Error fetching observations:`, error);
		return [];
	}
}

async function fetchVAA(vaaId: string): Promise<Uint8Array | null> {
	try {
		console.log(`🛠 Fetching VAA for ID: ${vaaId}`);
		const response = await axios.get(`https://api.wormholescan.io/v1/signed_vaa/${vaaId}`);
		const vaaBase64 = response.data.vaaBytes; // ✅ This was used in the previous script
		console.log('✅ VAA fetched.');
		return Buffer.from(vaaBase64, 'base64'); // Convert base64 to bytes
	} catch (error) {
		console.error('❌ Error fetching VAA:', error);
		return null;
	}
}

async function replaceSignatures(vaaId: string) {
	try {
		const [currentGuardians, guardianSetIndex] = await fetchGuardianSet();
		const observations = await fetchObservations(vaaId);

		console.log('🛠 Current Guardians:', currentGuardians);
		console.log('🛠 Observations:', observations);

		if (currentGuardians.length === 0 || observations.length === 0) {
			console.error('🚨 Cannot continue: Missing required data');
			return;
		}

		// ✅ Separate valid and outdated signatures
		const validSigs = observations.filter((sig: any) =>
			currentGuardians.includes(sig.guardianAddr)
		);
		const outdatedSigs = observations.filter(
			(sig: any) => !currentGuardians.includes(sig.guardianAddr)
		);

		console.log('✅ Valid Signatures:', validSigs.length);
		console.log('⚠️ Outdated Signatures:', outdatedSigs.length);

		// ✅ Convert valid signatures into required format
		const formattedSigs = validSigs.map((sig: any) => {
			const sigBuffer = Buffer.from(sig.signature, 'base64');

			return {
				guardianIndex: currentGuardians.indexOf(sig.guardianAddr), // ✅ Get the correct index
				signature: new Signature(
					BigInt('0x' + sigBuffer.subarray(0, 32).toString('hex')),
					BigInt('0x' + sigBuffer.subarray(32, 64).toString('hex')),
					sigBuffer[64]
				),
			};
		});

		console.log('✅ Formatted Signatures:', formattedSigs);

		// ✅ Fetch and deserialize the original VAA
		const vaa = await fetchVAA(vaaId);
		if (!vaa) {
			console.error('🚨 Cannot continue: VAA could not be fetched.');
			return;
		}

		let parsedVaa: VAA<'Uint8Array'>;
		try {
			parsedVaa = deserialize('Uint8Array', vaa);
			console.log('✅ VAA successfully deserialized.', parsedVaa);
		} catch (error) {
			console.error('❌ Error deserializing VAA:', error);
			return;
		}

		// ✅ Step 1: Identify outdated signatures in the VAA
		const outdatedGuardianIndexes = parsedVaa.signatures
			.filter(
				(vaaSig) => !formattedSigs.some((sig: any) => sig.guardianIndex === vaaSig.guardianIndex)
			)
			.map((sig) => sig.guardianIndex);

		console.log('⚠️ Outdated Guardian Indexes:', outdatedGuardianIndexes);

		// ✅ Step 2: Remove outdated signatures from the original VAA
		let updatedSignatures = parsedVaa.signatures.filter(
			(sig) => !outdatedGuardianIndexes.includes(sig.guardianIndex)
		);

		console.log('🛠 Signatures after removal:', updatedSignatures.length);

		// ✅ Step 3: Pick one valid signature to replace the outdated one
		// ✅ Step 3: Pick a valid replacement signature
		const validReplacement = formattedSigs.find(
			(sig: any) =>
				(sig.signature.v === 0 || sig.signature.v === 1) && // ✅ Ensure valid v value
				!updatedSignatures.some((s) => s.guardianIndex === sig.guardianIndex) // ✅ Ensure it's not already in the VAA
		);

		if (validReplacement) {
			updatedSignatures.push(validReplacement);
			console.log('✅ Replaced outdated signature with:', validReplacement);
		} else {
			console.error('🚨 No valid replacement signature found (must have v = 0 or 1).');
			return;
		}

		// console.log('updatedSignatures', updatedSignatures);
		// console.log('parsedVaa.signatures', parsedVaa.signatures);

		// ✅ Step 4: Ensure the number of signatures remains the same as original
		if (updatedSignatures.length !== parsedVaa.signatures.length) {
			console.error(
				'🚨 Signature count mismatch! Expected:',
				parsedVaa.signatures.length,
				'Got:',
				updatedSignatures.length
			);
			return;
		}

		// ✅ Step 5: Sort signatures by guardian index
		updatedSignatures.sort((a, b) => a.guardianIndex - b.guardianIndex);
		console.log('✅ Sorted Updated Signatures:', updatedSignatures);

		// ✅ Step 6: Update the VAA
		const updatedVaa: VAA<'Uint8Array'> = {
			...parsedVaa,
			guardianSet: guardianSetIndex, // ✅ Update guardian set index
			signatures: updatedSignatures,
		};

		// ✅ Serialize the updated VAA
		let patchedVaa: Uint8Array;
		try {
			console.log('UPDATED VAA:', updatedVaa.signatures);
			patchedVaa = serialize(updatedVaa);
			console.log('✅ VAA successfully serialized.');
		} catch (error) {
			console.error('❌ Error serializing updated VAA:', error);
			return;
		}

		// ✅ Send the patched VAA to Ethereum RPC
		try {
			// Ensure patchedVaa is a valid Uint8Array
			if (!(patchedVaa instanceof Uint8Array)) {
				throw new Error('🚨 patchedVaa is not a Uint8Array!');
			}

			// Convert Uint8Array to hex string
			const vaaHex = `0x${Buffer.from(patchedVaa).toString('hex')}`;

			console.log('🔍 Sending updated VAA to RPC:', vaaHex);

			const result = await axios.post(RPC, {
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_call',
				params: [
					{
						from: null,
						to: CORE,
						// data: `0x${Buffer.from(patchedVaa).toString('hex')}`,
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

// ✅ Run script
const TEST_VAA_ID = '2/0000000000000000000000003ee18b2214aff97000d974cf647e7c347e8fa585/164170';
replaceSignatures(TEST_VAA_ID);
