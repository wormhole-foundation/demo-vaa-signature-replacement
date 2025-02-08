import axios from 'axios';
import { WORMHOLE_SCAN_API } from '../config/constants';

// Function to fetch VAA data from Wormhole Scan API
export async function fetchVaaData(vaaIds: string[]): Promise<{ id: string; vaaBytes: string }[]> {
	const results: { id: string; vaaBytes: string }[] = [];

	for (const id of vaaIds) {
		try {
			const response = await axios.get(`${WORMHOLE_SCAN_API}/signed_vaa/${id}`);
			const vaaBytes = response.data.vaaBytes;
			results.push({ id, vaaBytes });
			console.log(`✅ Fetched VAA Data for ${id}`);
		} catch (error) {
			console.error(`❌ Error fetching VAA for ${id}:`, error);
		}
	}
	return results;
}
