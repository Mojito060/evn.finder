import { addRandomBrowserUseragent } from '@/bahnde/randomUseragent';
import { axiosUpstreamInterceptor } from '@/server/admin';
import { logger } from '@/server/logger';
import type { GroupedStopPlace } from '@/types/stopPlace';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { v4 } from 'uuid';

const bahnDeLocationsInterceptor = (req: InternalAxiosRequestConfig) => {
	req.headers.set('accept', 'application/json');
	req.headers.set('Referer', 'https://www.bahn.de/buchung/fahrplan/suche');
	req.headers.set('Origin', 'https://www.bahn.de');
	req.headers.set('x-correlation-id', `${v4()}_${v4()}`);
	return req;
};

const locationsAxios = axios.create({
	baseURL: 'https://www.bahn.de/web/api/reiseloesung',
	timeout: 5000,
});
locationsAxios.interceptors.request.use(addRandomBrowserUseragent);
locationsAxios.interceptors.request.use(bahnDeLocationsInterceptor);
axiosUpstreamInterceptor(locationsAxios, 'bahn.de-orte');

interface BahnDeOrt {
	id?: string;
	extId?: string;
	evaNumber?: string;
	name?: string;
	type?: string;
}

/**
 * Fallback for RIS::Stations name search using bahn.de's unauthenticated
 * public location search, when no RIS::Stations credentials are
 * configured or the request fails.
 */
export async function searchStopPlaceBahnDe(
	searchTerm: string,
): Promise<GroupedStopPlace[]> {
	try {
		const orte = (
			await locationsAxios.get<BahnDeOrt[]>('/orte', {
				params: {
					suchbegriff: searchTerm,
					typ: 'ALL',
					limit: 10,
				},
			})
		).data;

		return orte
			.filter((o) => o.extId || o.evaNumber)
			.map((o) => ({
				evaNumber: (o.extId || o.evaNumber)!,
				name: o.name || searchTerm,
				availableTransports: [],
			}));
	} catch (e) {
		logger.error(e, 'bahn.de Ortssuche failed');
		return [];
	}
}
