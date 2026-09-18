import { StopPlaceSearch } from '@/client/Common/Components/StopPlaceSearch';
import type { StopDeparture } from '@/external/generated/risBoards';
import { trpc } from '@/router';
import type { CoachSequenceInformation } from '@/types/coachSequence';
import type { MinimalStopPlace } from '@/types/stopPlace';
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { endOfDay, startOfDay } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { CoachList } from './CoachList';
import { EvnSaveButton } from './EvnSaveButton';
import { formatEvn, formatLine, formatTime } from './format';

interface RowResult {
	data?: CoachSequenceInformation;
	error?: boolean;
	loading?: boolean;
}

function normalizeLine(s: string) {
	return s.toLowerCase().replace(/\s+/g, '');
}

function normalizeEvn(s: string) {
	return s.replace(/\D/g, '');
}

function sequenceMatchesEvn(
	data: CoachSequenceInformation | undefined,
	targetEvnDigits: string,
): boolean {
	if (!data || !targetEvnDigits) return false;
	return data.sequence.groups.some((g) =>
		g.coaches.some((c) => {
			if (!c.uic) return false;
			const digits = normalizeEvn(c.uic);
			return digits === targetEvnDigits || digits.includes(targetEvnDigits);
		}),
	);
}

function matchesLine(departure: StopDeparture, lines: string[]): boolean {
	if (!lines.length) return true;
	const candidates = [
		departure.transport.line,
		`${departure.transport.category}${departure.transport.number}`,
	]
		.filter(Boolean)
		.map((c) => normalizeLine(c as string));
	return lines.some((l) => candidates.includes(normalizeLine(l)));
}

const DepartureRow: FC<{
	departure: StopDeparture;
	evaNumber: string;
	result?: RowResult;
	onResult: (journeyID: string, result: RowResult) => void;
	highlight?: boolean;
}> = ({ departure, evaNumber, result, onResult, highlight }) => {
	const trpcUtils = trpc.useUtils();

	const load = async () => {
		onResult(departure.journeyID, { loading: true });
		try {
			const data = await trpcUtils.coachSequence.sequence.fetch({
				trainNumber: departure.transport.number,
				category: departure.transport.category,
				administration: departure.administration.administrationID,
				evaNumber,
				departure: new Date(departure.timeSchedule),
				initialDeparture: new Date(departure.timeSchedule),
			});
			onResult(departure.journeyID, { data });
		} catch {
			onResult(departure.journeyID, { error: true });
		}
	};

	return (
		<Box
			sx={{
				borderBottom: '1px solid',
				borderColor: 'divider',
				py: 1,
				...(highlight
					? { bgcolor: 'success.main', color: 'success.contrastText', px: 1 }
					: {}),
			}}
		>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				flexWrap="wrap"
				gap={1}
			>
				<Typography variant="body2">
					{formatTime(departure.timeSchedule)} ·{' '}
					{formatLine(departure.transport.category, departure.transport.number)}
					{departure.transport.line
						? ` (Linie ${departure.transport.line})`
						: ''}{' '}
					→ {departure.transport.destination.name}
				</Typography>
				<Button size="small" onClick={load} disabled={result?.loading}>
					{result?.loading
						? 'Lädt…'
						: result?.data
							? 'Neu laden'
							: 'EVNs laden'}
				</Button>
			</Stack>
			<CoachList
				data={result?.data}
				isLoading={result?.loading}
				error={result?.error}
				label={formatLine(
					departure.transport.category,
					departure.transport.number,
				)}
			/>
		</Box>
	);
};

export const LineSearch: FC = () => {
	const [station, setStation] = useState<MinimalStopPlace>();
	const [lineInput, setLineInput] = useState('');
	const [date, setDate] = useState<Date>(new Date());
	const [params, setParams] = useState<{
		evaNumber: string;
		lines: string[];
		timeStart: Date;
		timeEnd: Date;
	}>();
	const [results, setResults] = useState<Record<string, RowResult>>({});
	const [targetEvn, setTargetEvn] = useState('');
	const bulkRunId = useRef(0);
	const trpcUtils = trpc.useUtils();

	const departuresQuery = trpc.boards.rawDepartures.useQuery(
		{
			evaNumber: params?.evaNumber ?? '',
			timeStart: params?.timeStart ?? new Date(),
			timeEnd: params?.timeEnd ?? new Date(),
		},
		{ enabled: Boolean(params) },
	);

	const submit = () => {
		if (!station) return;
		setResults({});
		setParams({
			evaNumber: station.evaNumber,
			lines: lineInput
				.split(',')
				.map((l) => l.trim())
				.filter(Boolean),
			timeStart: startOfDay(date),
			timeEnd: endOfDay(date),
		});
	};

	const filtered = useMemo(() => {
		if (!departuresQuery.data || !params) return [];
		return departuresQuery.data.departures.filter((d) =>
			matchesLine(d, params.lines),
		);
	}, [departuresQuery.data, params]);

	const targetEvnDigits = normalizeEvn(targetEvn);

	// biome-ignore lint/correctness/useExhaustiveDependencies: trpcUtils is stable, intentionally left out
	useEffect(() => {
		if (!targetEvnDigits || filtered.length === 0 || !params) return;

		bulkRunId.current += 1;
		const runId = bulkRunId.current;
		const evaNumber = params.evaNumber;
		const queue = [...filtered];
		const concurrency = 4;

		async function worker() {
			while (queue.length) {
				if (runId !== bulkRunId.current) return;
				const d = queue.shift();
				if (!d) return;
				setResults((old) => ({ ...old, [d.journeyID]: { loading: true } }));
				try {
					const data = await trpcUtils.coachSequence.sequence.fetch({
						trainNumber: d.transport.number,
						category: d.transport.category,
						administration: d.administration.administrationID,
						evaNumber,
						departure: new Date(d.timeSchedule),
						initialDeparture: new Date(d.timeSchedule),
					});
					if (runId !== bulkRunId.current) return;
					setResults((old) => ({ ...old, [d.journeyID]: { data } }));
				} catch {
					if (runId !== bulkRunId.current) return;
					setResults((old) => ({ ...old, [d.journeyID]: { error: true } }));
				}
			}
		}

		for (let i = 0; i < concurrency; i += 1) {
			void worker();
		}

		return () => {
			bulkRunId.current += 1;
		};
	}, [filtered, targetEvnDigits, params]);

	const evnSearchProgress = useMemo(() => {
		if (!targetEvnDigits || filtered.length === 0) return undefined;
		const done = filtered.filter((d) => {
			const r = results[d.journeyID];
			return r && !r.loading;
		}).length;
		return { done, total: filtered.length };
	}, [filtered, results, targetEvnDigits]);

	const matchingJourneyIds = useMemo(() => {
		if (!targetEvnDigits) return new Set<string>();
		const ids = new Set<string>();
		for (const [journeyID, r] of Object.entries(results)) {
			if (sequenceMatchesEvn(r.data, targetEvnDigits)) {
				ids.add(journeyID);
			}
		}
		return ids;
	}, [results, targetEvnDigits]);

	const aggregatedEvns = useMemo(() => {
		const set = new Set<string>();
		for (const r of Object.values(results)) {
			if (r.data) {
				for (const g of r.data.sequence.groups) {
					for (const c of g.coaches) {
						if (c.uic) set.add(c.uic);
					}
				}
			}
		}
		return [...set];
	}, [results]);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Liniensuche
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Zeigt alle Fahrten einer Linie (z.B. „S1“) an einem Bahnhof für einen
				Tag. Mehrere Linien kommagetrennt kombinieren (z.B. „RE1, RE6“), um auch
				Fahrzeuge zu erfassen, die im Tagesverlauf die Linie wechseln (z.B. beim
				Rhein-Ruhr-Express).
			</Typography>
			<Stack
				direction="row"
				gap={2}
				flexWrap="wrap"
				alignItems="flex-start"
				sx={{ mb: 2 }}
			>
				<Box sx={{ minWidth: 240 }}>
					<StopPlaceSearch
						id="lineSearchStation"
						value={station}
						onChange={setStation}
						placeholder="Bahnhof"
					/>
				</Box>
				<TextField
					label="Linie(n)"
					placeholder="z.B. S1 oder RE1, RE6"
					value={lineInput}
					onChange={(e) => setLineInput(e.target.value)}
					size="small"
				/>
				<MobileDatePicker
					label="Datum"
					value={date}
					onChange={(v) => v && setDate(v)}
					slotProps={{ textField: { size: 'small' } }}
				/>
				<Button variant="contained" onClick={submit} disabled={!station}>
					Suchen
				</Button>
			</Stack>

			<TextField
				label="EVN in diesen Fahrten suchen (optional)"
				placeholder="z.B. 94 80 0432 505-6"
				value={targetEvn}
				onChange={(e) => setTargetEvn(e.target.value)}
				size="small"
				sx={{ mb: 2, minWidth: 280 }}
				helperText="Lädt automatisch die Wagenreihung aller gefundenen Fahrten dieser Linie(n) und markiert Treffer. Findet nur Fahrten auf den oben angegebenen Linien, keinen Linienwechsel."
			/>

			{departuresQuery.isFetching && <CircularProgress size={20} />}
			{departuresQuery.isError && (
				<Alert severity="error">Fehler beim Laden der Abfahrten.</Alert>
			)}

			{params && !departuresQuery.isFetching && departuresQuery.data && (
				<Typography variant="body2" sx={{ mb: 1 }}>
					{filtered.length} Fahrt(en) gefunden.
				</Typography>
			)}

			{evnSearchProgress && (
				<Alert
					severity={matchingJourneyIds.size > 0 ? 'success' : 'info'}
					sx={{ mb: 2 }}
				>
					{evnSearchProgress.done < evnSearchProgress.total
						? `Durchsuche Wagenreihung: ${evnSearchProgress.done}/${evnSearchProgress.total} Fahrten geprüft…`
						: matchingJourneyIds.size > 0
							? `Gefunden in ${matchingJourneyIds.size} Fahrt(en) - grün markiert unten.`
							: `${evnSearchProgress.total} Fahrten geprüft, EVN nicht gefunden. Ggf. andere Linie(n) probieren (Linienwechsel im Tagesverlauf werden hier nicht erkannt).`}
				</Alert>
			)}

			{aggregatedEvns.length > 0 && (
				<Stack sx={{ mb: 2 }}>
					<Typography variant="subtitle2">
						Geladene EVNs auf dieser Linie ({aggregatedEvns.length})
					</Typography>
					<Stack sx={{ mt: 1 }}>
						{aggregatedEvns.map((evn) => (
							<Stack
								key={evn}
								direction="row"
								alignItems="center"
								justifyContent="space-between"
							>
								<Typography variant="body2">{formatEvn(evn)}</Typography>
								<EvnSaveButton evn={evn} />
							</Stack>
						))}
					</Stack>
				</Stack>
			)}

			<Stack>
				{filtered.map((d) => (
					<DepartureRow
						key={d.journeyID}
						departure={d}
						evaNumber={params!.evaNumber}
						result={results[d.journeyID]}
						onResult={(id, r) => setResults((old) => ({ ...old, [id]: r }))}
						highlight={matchingJourneyIds.has(d.journeyID)}
					/>
				))}
			</Stack>
		</Paper>
	);
};
