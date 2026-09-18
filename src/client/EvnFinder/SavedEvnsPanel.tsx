import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import {
	Button,
	IconButton,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { useRef } from 'react';
import type { FC } from 'react';
import { formatEvn } from './format';
import {
	type SavedEvn,
	removeEvn,
	replaceAllEvns,
	updateEvnLabel,
	useSavedEvns,
} from './savedEvns';

interface Props {
	onSelect: (evn: string) => void;
}

export const SavedEvnsPanel: FC<Props> = ({ onSelect }) => {
	const saved = useSavedEvns();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const exportJson = () => {
		const blob = new Blob([JSON.stringify(saved, null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'evn-finder-export.json';
		a.click();
		URL.revokeObjectURL(url);
	};

	const importJson = async (file: File) => {
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed)) {
				const valid = parsed.filter(
					(e): e is SavedEvn => e && typeof e.evn === 'string',
				);
				replaceAllEvns(valid);
			}
		} catch {
			// ungültige Datei - wird ignoriert
		}
	};

	return (
		<Paper
			variant="outlined"
			sx={{ p: 2, position: { md: 'sticky' }, top: { md: 16 } }}
			data-testid="savedEvnsPanel"
		>
			<Typography variant="h6" gutterBottom>
				Gespeicherte EVNs ({saved.length})
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Wird nur lokal in deinem Browser gespeichert (localStorage). Kein
				Server, kein Konto, kein Tracking.
			</Typography>
			{!saved.length && (
				<Typography variant="body2">Noch keine EVNs gemerkt.</Typography>
			)}
			<Stack gap={1.5}>
				{saved.map((e) => (
					<Stack
						key={e.evn}
						sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}
					>
						<Stack
							direction="row"
							alignItems="center"
							justifyContent="space-between"
						>
							<Typography variant="body2" fontWeight="bold">
								{formatEvn(e.evn)}
							</Typography>
							<Stack direction="row">
								<IconButton
									size="small"
									onClick={() => onSelect(e.evn)}
									title="Fahrten anzeigen"
								>
									<SearchIcon fontSize="small" />
								</IconButton>
								<IconButton
									size="small"
									onClick={() => removeEvn(e.evn)}
									title="Entfernen"
								>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Stack>
						</Stack>
						<TextField
							variant="standard"
							placeholder="Notiz (optional)"
							defaultValue={e.label ?? ''}
							onBlur={(ev) => updateEvnLabel(e.evn, ev.target.value)}
							fullWidth
						/>
					</Stack>
				))}
			</Stack>
			<Stack direction="row" gap={1} sx={{ mt: 2 }}>
				<Button
					size="small"
					startIcon={<DownloadIcon />}
					onClick={exportJson}
					disabled={!saved.length}
				>
					Export
				</Button>
				<Button
					size="small"
					startIcon={<UploadIcon />}
					onClick={() => fileInputRef.current?.click()}
				>
					Import
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept="application/json"
					hidden
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void importJson(file);
						e.target.value = '';
					}}
				/>
			</Stack>
		</Paper>
	);
};
