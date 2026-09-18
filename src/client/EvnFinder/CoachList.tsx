import type { CoachSequenceInformation } from '@/types/coachSequence';
import {
	Alert,
	Chip,
	CircularProgress,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
import type { FC } from 'react';
import { EvnSaveButton } from './EvnSaveButton';
import { formatEvn, formatLine } from './format';

interface Props {
	data?: CoachSequenceInformation | null;
	isLoading?: boolean;
	error?: unknown;
	label?: string;
}

export const CoachList: FC<Props> = ({ data, isLoading, error, label }) => {
	if (isLoading) {
		return (
			<Stack direction="row" alignItems="center" gap={1} sx={{ py: 1 }}>
				<CircularProgress size={18} />
				<Typography variant="body2">Wagenreihung wird geladen…</Typography>
			</Stack>
		);
	}

	if (error) {
		return (
			<Alert severity="warning" sx={{ my: 1 }}>
				Keine Wagenreihung gefunden. Entweder liegt der Zeitpunkt zu weit in der
				Vergangenheit/Zukunft, oder die Daten sind (noch) nicht verfügbar.
			</Alert>
		);
	}

	if (!data) {
		return null;
	}

	const coaches = data.sequence.groups.flatMap((g) =>
		g.coaches.map((c) => ({ ...c, groupName: g.name || g.number })),
	);
	const withEvn = coaches.filter((c) => c.uic);

	if (!withEvn.length) {
		return (
			<Alert severity="info" sx={{ my: 1 }}>
				Für diese Fahrt liegt aktuell keine Fahrzeugnummer (EVN) vor.
			</Alert>
		);
	}

	return (
		<Stack gap={1} sx={{ my: 1 }}>
			<Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
				<Chip
					size="small"
					label={data.isRealtime ? 'Live-Wagenreihung' : 'Planwagenreihung'}
					color={data.isRealtime ? 'success' : 'default'}
				/>
				<Chip size="small" variant="outlined" label={data.source} />
			</Stack>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Gruppe</TableCell>
						<TableCell>Wagen-Nr.</TableCell>
						<TableCell>EVN</TableCell>
						<TableCell>Typ</TableCell>
						<TableCell align="right">Merken</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{withEvn.map((c, i) => (
						<TableRow key={`${c.uic}-${i}`}>
							<TableCell>{c.groupName}</TableCell>
							<TableCell>{c.identificationNumber ?? '-'}</TableCell>
							<TableCell data-testid="coach-evn">{formatEvn(c.uic!)}</TableCell>
							<TableCell>{c.type ?? c.vehicleCategory}</TableCell>
							<TableCell align="right">
								<EvnSaveButton
									evn={c.uic!}
									label={
										label ?? formatLine(data.product.type, data.product.number)
									}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Stack>
	);
};
