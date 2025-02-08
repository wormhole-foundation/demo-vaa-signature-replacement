import axios from 'axios';
import { eth } from 'web3';
import { RPC, CORE, PARSE_AND_VERIFY_VM_ABI } from '../config';

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
