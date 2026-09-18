declare module 'db-hafas-stations' {
	interface SimplifiedStation {
		type: 'station';
		id: string;
		name: string;
		weight: number;
	}

	export function readSimplifiedStations(): AsyncGenerator<SimplifiedStation>;
	export function readFullStations(): AsyncGenerator<Record<string, unknown>>;
}
