import axios from 'axios';
import { WORMHOLE_SCAN_API } from '../config';

// ✅ Fetch current guardian set
export async function fetchGuardianSet() {
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
