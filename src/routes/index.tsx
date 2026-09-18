import { EvnFinderPage } from '@/client/EvnFinder/EvnFinderPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: EvnFinderPage,
});
