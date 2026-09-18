import type { RouteStop } from '@/types/routing';
import {
	Button,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Typography,
} from '@mui/material';
import type { FC } from 'react';
import { formatTime } from './format';

interface Props {
	stops: RouteStop[];
	selectedEvaNumber?: string;
	onSelectStop?: (stop: RouteStop) => void;
}

export const RouteStops: FC<Props> = ({
	stops,
	selectedEvaNumber,
	onSelectStop,
}) => {
	if (!stops.length) {
		return <Typography variant="body2">Keine Halte bekannt.</Typography>;
	}

	return (
		<List dense data-testid="routeStops">
			{stops.map((stop, i) => {
				const time =
					stop.departure?.scheduledTime ?? stop.arrival?.scheduledTime;
				const canLoadSequence = onSelectStop && Boolean(stop.departure);
				const selected = selectedEvaNumber === stop.station.evaNumber;

				const content = (
					<ListItemText
						primary={`${formatTime(time)}  ${stop.station.name}`}
						secondary={[
							stop.departure?.platform && `Gleis ${stop.departure.platform}`,
							stop.cancelled && 'Fällt aus',
						]
							.filter(Boolean)
							.join(' · ')}
					/>
				);

				if (canLoadSequence) {
					return (
						<ListItemButton
							key={`${stop.station.evaNumber}-${i}`}
							selected={selected}
							onClick={() => onSelectStop(stop)}
							data-testid="routeStop"
						>
							{content}
							<Button size="small" component="span">
								{selected ? 'EVNs ausgewählt' : 'EVNs anzeigen'}
							</Button>
						</ListItemButton>
					);
				}

				return (
					<ListItem key={`${stop.station.evaNumber}-${i}`}>{content}</ListItem>
				);
			})}
		</List>
	);
};
