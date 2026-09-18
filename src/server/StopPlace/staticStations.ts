import { logger } from '@/server/logger';
import type { GroupedStopPlace } from '@/types/stopPlace';
import { readSimplifiedStations } from 'db-hafas-stations';

interface StaticStation {
	id: string;
	name: string;
	weight: number;
}

let stationsPromise: Promise<StaticStation[]> | undefined;

async function loadStations(): Promise<StaticStation[]> {
	const stations: StaticStation[] = [];
	for await (const station of readSimplifiedStations()) {
		if (station.id && station.name) {
			stations.push({
				id: station.id,
				name: station.name,
				weight: station.weight ?? 0,
			});
		}
	}
	return stations;
}

function getStations(): Promise<StaticStation[]> {
	if (!stationsPromise) {
		stationsPromise = loadStations().catch((e) => {
			logger.error(e, 'failed to load static db-hafas-stations dataset');
			stationsPromise = undefined;
			return [];
		});
	}
	return stationsPromise;
}

/**
 * Fallback for RIS::Stations name search using a static, bundled snapshot
 * of DB station master data (github.com/derhuerst/db-hafas-stations),
 * for when live RIS::Stations/bahn.de access isn't available. Station
 * master data barely changes, so a frozen snapshot is an acceptable
 * substitute for search-as-you-type suggestions.
 */
export async function searchStopPlaceStatic(
	searchTerm: string,
	max = 10,
): Promise<GroupedStopPlace[]> {
	const normalized = searchTerm.trim().toLowerCase();
	if (!normalized) return [];

	const stations = await getStations();
	const matches = stations.filter((s) =>
		s.name.toLowerCase().includes(normalized),
	);

	matches.sort((a, b) => {
		const aStarts = a.name.toLowerCase().startsWith(normalized);
		const bStarts = b.name.toLowerCase().startsWith(normalized);
		if (aStarts !== bStarts) return aStarts ? -1 : 1;
		return b.weight - a.weight;
	});

	return matches.slice(0, max).map((s) => ({
		evaNumber: s.id,
		name: s.name,
		availableTransports: [],
	}));
}
