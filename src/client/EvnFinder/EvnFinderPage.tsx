import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import type { FC } from 'react';
import { LineSearch } from './LineSearch';
import { SavedEvnsPanel } from './SavedEvnsPanel';
import { TrainSearch } from './TrainSearch';
import { VehicleSearch } from './VehicleSearch';

export const EvnFinderPage: FC = () => {
	const [tab, setTab] = useState(0);
	const [prefillEvn, setPrefillEvn] = useState<string>();

	const selectEvn = (evn: string) => {
		setPrefillEvn(evn);
		setTab(2);
	};

	return (
		<Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
			<Typography variant="h4" gutterBottom>
				EVN Finder
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Suche europäische Fahrzeugnummern (EVNs) über Zug- oder Liniensuche,
				sieh dir alle Halte einer Fahrt an und merke dir EVNs — alles bleibt
				ausschließlich lokal in deinem Browser gespeichert.
			</Typography>
			<Stack
				direction={{ xs: 'column', md: 'row' }}
				gap={3}
				alignItems="flex-start"
			>
				<Box sx={{ flex: 2, minWidth: 0, width: '100%' }}>
					<Tabs
						value={tab}
						onChange={(_e, v) => setTab(v)}
						sx={{ mb: 2 }}
						variant="scrollable"
						scrollButtons="auto"
					>
						<Tab label="Zug suchen" data-testid="tab-train" />
						<Tab label="Liniensuche" data-testid="tab-line" />
						<Tab label="EVN suchen" data-testid="tab-vehicle" />
					</Tabs>
					{tab === 0 && <TrainSearch />}
					{tab === 1 && <LineSearch />}
					{tab === 2 && <VehicleSearch initialEvn={prefillEvn} />}
				</Box>
				<Box sx={{ flex: 1, minWidth: { md: 300 }, width: '100%' }}>
					<SavedEvnsPanel onSelect={selectEvn} />
				</Box>
			</Stack>
		</Box>
	);
};
