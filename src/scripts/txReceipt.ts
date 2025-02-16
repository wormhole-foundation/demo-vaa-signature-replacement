import { fetchVaaIds } from '../helpers';
import { TXS } from '../config';

async function main() {
	try {
		for (const tx of TXS) {
			console.log(
				'\n --------------------------------------------------------------------------------------------------------'
			);
			console.log(`\nProcessing TX: ${tx}\n`);

			// 1. Fetch Transaction VAA IDs:
			const vaaIds = await fetchVaaIds([tx]);
			if (vaaIds.length === 0 || !vaaIds) continue;

			console.log(`Transaction ID: ${vaaIds[0]}`);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(`❌ ${error.message}`);
		} else {
			console.error('❌ Unexpected error in main execution:', error);
		}
		process.exit(1);
	}
}

main();
