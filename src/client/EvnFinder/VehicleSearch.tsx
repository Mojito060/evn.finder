import type { MatchVehicleID } from '@/external/generated/risTransports';
import { trpc } from '@/router';
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
import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { EvnSaveButton } from './EvnSaveButton';
import { RouteStops } from './RouteStops';
import { formatDateTime, formatLine } from './format';
import { normalizeEvn } from './savedEvns';

const VehicleJourneyRow: FC<{ journey: MatchVehicleID }> = ({ journey }) => {
	const [expanded, setExpanded] = useState(false);
	const detailsQuery = trpc.journeys.detailsByJourneyId.useQuery(
		journey.journeyID,
		{ enabled: expanded },
	);

	return (
		<Box sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				flexWrap="wrap"
				gap={1}
			>
				<Typography variant="body2" data-testid="vehicleJourneyRow">
					{formatDateTime(journey.journeyRelation.startTime)} ·{' '}
					{formatLine(
						journey.journeyRelation.startCategory,
						journey.journeyRelation.startJourneyNumber,
					)}
				</Typography>
				<Button size="small" onClick={() => setExpanded((v) => !v)}>
					{expanded ? 'Route ausblenden' : 'Route anzeigen'}
				</Button>
			</Stack>
			{expanded &&
				(detailsQuery.isFetching ? (
					<CircularProgress size={18} />
				) : detailsQuery.data ? (
					<RouteStops stops={detailsQuery.data.stops} />
				) : (
					<Alert severity="warning" sx={{ mt: 1 }}>
						Route konnte nicht geladen werden.
					</Alert>
				))}
		</Box>
	);
};

interface Props {
	initialEvn?: string;
}

export const VehicleSearch: FC<Props> = ({ initialEvn }) => {
	const [input, setInput] = useState(initialEvn ?? '');
	const [vehicleId, setVehicleId] = useState<string | undefined>(initialEvn);

	useEffect(() => {
		if (initialEvn) {
			setInput(initialEvn);
			setVehicleId(initialEvn);
		}
	}, [initialEvn]);

	const query = trpc.coachSequence.vehicleJourneys.useQuery(
		{ vehicleId: vehicleId ?? '' },
		{ enabled: Boolean(vehicleId) },
	);

	const submit = () => {
		const normalized = normalizeEvn(input);
		if (!normalized) return;
		setVehicleId(normalized);
	};

	const sorted = useMemo(() => {
		if (!query.data) return [];
		return [...query.data].sort(
			(a, b) =>
				new Date(a.journeyRelation.startTime).getTime() -
				new Date(b.journeyRelation.startTime).getTime(),
		);
	}, [query.data]);

	const lines = useMemo(
		() =>
			new Set(
				sorted.map((j) =>
					formatLine(
						j.journeyRelation.startCategory,
						j.journeyRelation.startJourneyNumber,
					),
				),
			),
		[sorted],
	);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				EVN suchen
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				EVN/UIC-Fahrzeugnummer eingeben, um alle Fahrten dieses Fahrzeugs
				anzuzeigen — auch wenn es im Tagesverlauf die Linie wechselt (z.B. RE1 →
				RE6 beim Rhein-Ruhr-Express). Verfügbar für ca. ±1 Tag um jetzt.
			</Typography>
			<Stack
				direction="row"
				gap={2}
				alignItems="center"
				sx={{ mb: 2 }}
				flexWrap="wrap"
			>
				<TextField
					label="EVN / UIC-Fahrzeugnummer"
					placeholder="z.B. 94805460123-4"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					size="small"
					sx={{ minWidth: 260 }}
				/>
				<Button variant="contained" onClick={submit}>
					Suchen
				</Button>
				{vehicleId && <EvnSaveButton evn={vehicleId} />}
			</Stack>

			{query.isFetching && <CircularProgress size={20} />}
			{query.isError && <Alert severity="error">Fehler bei der Suche.</Alert>}
			{vehicleId && query.data && !query.data.length && (
				<Alert severity="info">
					Keine Fahrten gefunden — entweder ist das Fahrzeug aktuell nicht
					unterwegs, oder RIS::Transports-Zugangsdaten sind nicht konfiguriert
					(siehe README).
				</Alert>
			)}

			{lines.size > 1 && (
				<Alert severity="success" sx={{ mb: 2 }}>
					Dieses Fahrzeug wechselt heute die Linie: {[...lines].join(' → ')}
				</Alert>
			)}

			<Stack>
				{sorted.map((j) => (
					<VehicleJourneyRow key={j.journeyID} journey={j} />
				))}
			</Stack>
		</Paper>
	);
};
