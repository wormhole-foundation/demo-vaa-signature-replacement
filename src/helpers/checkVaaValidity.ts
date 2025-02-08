import axios from 'axios';
import { eth } from 'web3';
import { RPC, CORE } from '../config/constants';

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

// ✅ Function to check if VAA is valid
export async function checkVaaValidity(vaaBytes: string) {
	try {
		const vaa = Buffer.from(vaaBytes, 'base64');
		vaa[4] = 4; // Set guardian set index to 4

		const result = (
			await axios.post(RPC, {
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_call',
				params: [
					{
						from: null,
						to: CORE,
						data: eth.abi.encodeFunctionCall(PARSE_AND_VERIFY_VM_ABI, [`0x${vaa.toString('hex')}`]),
					},
					'latest',
				],
			})
		).data.result;

		const decoded = eth.abi.decodeParameters(PARSE_AND_VERIFY_VM_ABI.outputs, result);
		return { valid: decoded.valid, reason: decoded.reason };
	} catch (error) {
		console.error(`❌ Error checking VAA validity:`, error);
		return { valid: false, reason: 'RPC error' };
	}
}
