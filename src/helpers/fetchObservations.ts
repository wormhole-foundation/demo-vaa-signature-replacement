import axios from 'axios';

/**
 * Fetches observations (signatures) for a given VAA ID from Wormhole Scan API.
 * @param {string} vaaId - The VAA ID in format "chain/emitter/sequence"
 * @returns {Promise<any[]>} - Returns an array of formatted signatures
 */
export async function fetchObservations(vaaId: string) {
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
