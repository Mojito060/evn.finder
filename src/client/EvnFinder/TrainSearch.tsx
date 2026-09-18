import { trpc } from '@/router';
import type { JourneyFindResponse } from '@/types/journey';
import type { RouteStop } from '@/types/routing';
import {
	Alert,
	Button,
	CircularProgress,
	List,
	ListItemButton,
	ListItemText,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import { useState } from 'react';
import type { FC } from 'react';
import { CoachList } from './CoachList';
import { RouteStops } from './RouteStops';
import { formatLine } from './format';

interface SearchParams {
	trainNumber: number;
	category?: string;
	date: Date;
}

export const TrainSearch: FC = () => {
	const [trainNumber, setTrainNumber] = useState('');
	const [category, setCategory] = useState('');
	const [date, setDate] = useState<Date>(new Date());
	const [params, setParams] = useState<SearchParams>();
	const [journey, setJourney] = useState<JourneyFindResponse>();
	const [selectedStop, setSelectedStop] = useState<RouteStop>();

	const findQuery = trpc.journeys.find.useQuery(
		{
			trainNumber: params?.trainNumber ?? 0,
			category: params?.category || undefined,
			initialDepartureDate: params?.date,
		},
		{ enabled: Boolean(params) },
	);

	const sequenceQuery = trpc.coachSequence.sequence.useQuery(
		{
			trainNumber: Number.parseInt(journey?.train.number || '0'),
			category: journey?.train.type || '',
			administration: journey?.train.admin,
			evaNumber: selectedStop?.station.evaNumber || '',
			departure: selectedStop?.departure?.scheduledTime as Date,
			initialDeparture: journey?.firstStop.departure?.scheduledTime,
		},
		{
			enabled: Boolean(
				journey &&
					selectedStop?.departure?.scheduledTime &&
					journey.train.number,
			),
		},
	);

	const submit = () => {
		const parsed = Number.parseInt(trainNumber, 10);
		if (Number.isNaN(parsed)) return;
		setJourney(undefined);
		setSelectedStop(undefined);
		setParams({ trainNumber: parsed, category: category.trim(), date });
	};

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Zug suchen
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Suche nach Zugnummer, um alle Halte der Fahrt und die Wagenreihung
				(EVNs) an einem Halt anzuzeigen.
			</Typography>
			<Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
				<TextField
					label="Zugnummer"
					placeholder="z.B. 4571"
					value={trainNumber}
					onChange={(e) => setTrainNumber(e.target.value)}
					type="number"
					size="small"
				/>
				<TextField
					label="Gattung (optional)"
					placeholder="z.B. RE, ICE, S"
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					size="small"
				/>
				<MobileDateTimePicker
					label="Datum/Zeit"
					value={date}
					onChange={(v) => v && setDate(v)}
					slotProps={{ textField: { size: 'small' } }}
				/>
				<Button variant="contained" onClick={submit}>
					Suchen
				</Button>
			</Stack>

			{findQuery.isFetching && <CircularProgress size={20} />}
			{findQuery.isError && (
				<Alert severity="error">Fehler bei der Suche.</Alert>
			)}
			{findQuery.data && !findQuery.data.length && (
				<Alert severity="info">Kein Zug gefunden.</Alert>
			)}

			{findQuery.data && findQuery.data.length > 0 && !journey && (
				<List dense>
					{findQuery.data.map((j) => (
						<ListItemButton
							key={j.journeyId}
							onClick={() => setJourney(j)}
							data-testid="trainSearchResult"
						>
							<ListItemText
								primary={j.train.name}
								secondary={`${j.firstStop.station.name} → ${j.lastStop.station.name}`}
							/>
						</ListItemButton>
					))}
				</List>
			)}

			{journey && (
				<Stack gap={1} sx={{ mt: 2 }}>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
					>
						<Typography variant="subtitle1">
							{journey.train.name} — alle Halte
						</Typography>
						<Button size="small" onClick={() => setJourney(undefined)}>
							Andere Fahrt wählen
						</Button>
					</Stack>
					<RouteStops
						stops={journey.stops}
						selectedEvaNumber={selectedStop?.station.evaNumber}
						onSelectStop={setSelectedStop}
					/>
					{selectedStop && (
						<CoachList
							data={sequenceQuery.data}
							isLoading={sequenceQuery.isFetching}
							error={sequenceQuery.error}
							label={formatLine(journey.train.type, journey.train.number)}
						/>
					)}
				</Stack>
			)}
		</Paper>
	);
};
