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
import { useMemo, useState } from 'react';
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
}> = ({ departure, evaNumber, result, onResult }) => {
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
		<Box sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
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

			{departuresQuery.isFetching && <CircularProgress size={20} />}
			{departuresQuery.isError && (
				<Alert severity="error">Fehler beim Laden der Abfahrten.</Alert>
			)}

			{params && !departuresQuery.isFetching && departuresQuery.data && (
				<Typography variant="body2" sx={{ mb: 1 }}>
					{filtered.length} Fahrt(en) gefunden.
				</Typography>
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
					/>
				))}
			</Stack>
		</Paper>
	);
};
