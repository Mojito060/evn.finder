import type {
	BoardPublicDeparture,
	StopDeparture,
} from '@/external/generated/risBoards';
import {
	JourneyType,
	TimeType,
	TransportType,
} from '@/external/generated/risBoards';
import { getAbfahrten } from '@/server/iris';
import type { Abfahrt } from '@/types/iris';
import { differenceInMinutes } from 'date-fns';

function toIso(value: Date | string): string {
	return typeof value === 'string' ? value : value.toISOString();
}

function mapAbfahrtToStopDeparture(
	a: Abfahrt,
	evaNumber: string,
): StopDeparture | undefined {
	const scheduledTime = a.departure?.scheduledTime ?? a.arrival?.scheduledTime;
	if (!scheduledTime) {
		return undefined;
	}
	const time = a.departure?.time ?? a.arrival?.time ?? scheduledTime;

	return {
		additional: Boolean(a.additional),
		administration: {
			administrationID: a.train.admin ?? '',
			operatorCode: '',
			operatorName: '',
		},
		canceled: Boolean(a.cancelled),
		departureID: a.rawId,
		futureDisruptions: false,
		journeyID: a.rawId,
		journeyType: JourneyType.Regular,
		onDemand: false,
		platform: a.platform ?? '',
		station: {
			evaNumber,
			name: a.currentStopPlace.name,
		},
		time: toIso(time),
		timeSchedule: toIso(scheduledTime),
		timeType: TimeType.Schedule,
		transport: {
			category: a.train.type,
			destination: {
				canceled: false,
				evaNumber: a.initialStopPlace ?? evaNumber,
				name: a.destination || a.scheduledDestination || '',
			},
			journeyID: a.rawId,
			line: a.train.line,
			number: Number.parseInt(a.train.number, 10) || 0,
			type: TransportType.Unknown,
			via: [],
		},
	};
}

/**
 * Fallback for RIS::Boards using the unofficial, unauthenticated IRIS-TTS
 * endpoint (iris.noncd.db.de) when no RIS::Boards credentials are
 * configured or the request fails.
 */
export async function getIrisDepartures(
	evaNumber: string,
	timeStart: Date,
	timeEnd: Date,
): Promise<BoardPublicDeparture> {
	const lookahead = Math.max(1, differenceInMinutes(timeEnd, timeStart));
	const result = await getAbfahrten(evaNumber, false, {
		lookahead,
		lookbehind: 0,
		startTime: timeStart,
	});

	const departures = result.departures
		.map((a) => mapAbfahrtToStopDeparture(a, evaNumber))
		.filter((d): d is StopDeparture => Boolean(d));

	return { departures };
}
