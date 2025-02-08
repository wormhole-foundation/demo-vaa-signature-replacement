import axios from 'axios';

/**
 * Fetches observations (signatures) for a given VAA ID from Wormhole Scan API.
 * @param {string} vaaId - The VAA ID in format "chain/emitter/sequence"
 * @returns {Promise<any[]>} - Returns an array of formatted signatures
 */
export async function fetchObservations(vaaId: string): Promise<any[]> {
	try {
		console.log(`🛠 Fetching observations for VAA ID: ${vaaId}`);

		const response = await axios.get(`https://api.wormholescan.io/api/v1/observations/${vaaId}`);
		const data: any[] = response.data;

		// Decode signatures
		const sigs = data.map((d) => {
			const signatureBuffer = Buffer.from(d.signature, 'base64'); // Convert base64 to bytes
			const r = BigInt('0x' + signatureBuffer.subarray(0, 32).toString('hex')); // Extract r
			const s = BigInt('0x' + signatureBuffer.subarray(32, 64).toString('hex')); // Extract s
			const v = signatureBuffer[64]; // Extract v (1 byte)

			return {
				guardianAddr: d.guardianAddr.toLowerCase(),
				r: r.toString(),
				s: s.toString(),
				v,
			};
		});

		console.log(`✅ Decoded Signatures for ${vaaId}:`, JSON.stringify(sigs, null, 2));
		return sigs;
	} catch (error) {
		console.error(`❌ Error fetching observations for ${vaaId}:`, error);
		return [];
	}
}
