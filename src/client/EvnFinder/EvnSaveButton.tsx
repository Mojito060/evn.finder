import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { IconButton, Tooltip } from '@mui/material';
import type { FC } from 'react';
import { isEvnSaved, removeEvn, saveEvn, useSavedEvns } from './savedEvns';

interface Props {
	evn: string;
	label?: string;
}

export const EvnSaveButton: FC<Props> = ({ evn, label }) => {
	// re-render on any change to the saved list, so the icon stays correct
	// even if the same EVN gets saved/removed from another part of the page
	useSavedEvns();
	const saved = isEvnSaved(evn);

	return (
		<Tooltip title={saved ? 'EVN aus Merkliste entfernen' : 'EVN merken'}>
			<IconButton
				size="small"
				data-testid={`evn-save-${evn}`}
				onClick={(e) => {
					e.stopPropagation();
					if (saved) {
						removeEvn(evn);
					} else {
						saveEvn(evn, label);
					}
				}}
			>
				{saved ? (
					<BookmarkIcon fontSize="small" />
				) : (
					<BookmarkBorderIcon fontSize="small" />
				)}
			</IconButton>
		</Tooltip>
	);
};
