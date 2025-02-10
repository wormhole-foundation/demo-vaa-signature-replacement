import Web3 from 'web3';
import { OUTPUT_TYPES } from '../config';

const web3 = new Web3();

export async function decodeResponse(rawResponse: string) {
	try {
		// Decode the response
		const decoded = web3.eth.abi.decodeParameters(OUTPUT_TYPES, rawResponse);

		console.log('Decoded Response:', decoded);
		console.log('Verification Result:', decoded.valid);

		// Log failure reason only if valid is false
		if (decoded.valid === false) {
			console.log('⚠️ Reason for failure:', decoded.reason);
		}

		return;
	} catch (error) {
		console.error('❌ Error decoding RPC response', error);
		return;
	}
}
