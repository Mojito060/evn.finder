import type { BoardPublicDeparture } from '@/external/generated/risBoards';
import { rawRisDepartures } from '@/external/risBoards';
import { getIrisDepartures } from '@/server/boards/irisFallback';
import { logger } from '@/server/logger';
import { rpcAppRouter, rpcProcedure } from '@/server/rpc/base';
import type { QueryProcedure } from '@trpc/server/unstable-core-do-not-import';
import { z } from 'zod';

async function getDepartures(
	evaNumber: string,
	timeStart: Date,
	timeEnd: Date,
): Promise<BoardPublicDeparture> {
	if (process.env.RIS_BOARDS_URL) {
		try {
			return await rawRisDepartures(evaNumber, timeStart, timeEnd);
		} catch (e) {
			logger.warn(e, 'RIS::Boards failed, falling back to IRIS');
		}
	}
	try {
		return await getIrisDepartures(evaNumber, timeStart, timeEnd);
	} catch (e) {
		logger.error(e, 'IRIS fallback failed');
		return { departures: [] };
	}
}

type RawRisDeparturesProcedure = QueryProcedure<{
	input: {
		evaNumber: string;
		timeStart: Date;
		timeEnd: Date;
	};
	output: BoardPublicDeparture;
}>;

export const boardsRpcRouter = rpcAppRouter({
	rawDepartures: rpcProcedure
		.meta({
			openapi: {
				method: 'GET',
				path: '/boards/v1/departures/{evaNumber}',
			},
		})
		.input(
			z.object({
				evaNumber: z.string(),
				timeStart: z.date(),
				timeEnd: z.date(),
			}),
		)
		.output(z.any())
		.query(({ input: { evaNumber, timeStart, timeEnd } }) => {
			return getDepartures(evaNumber, timeStart, timeEnd);
		}) as RawRisDeparturesProcedure,
});
