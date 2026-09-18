import { rpcAppRouter } from '@/server/rpc/base';
import { boardsRpcRouter } from '@/server/rpc/boards';
import { coachSequenceRpcRouter } from '@/server/rpc/coachSequence';
import { journeysRpcRouter } from '@/server/rpc/journeys';
import { stopPlaceRpcRouter } from '@/server/rpc/stopPlace';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createOpenApiHttpHandler } from 'trpc-to-openapi';
import { eventHandler } from 'vinxi/http';

// Nur die Router, die das EVN-Finder-Feature tatsächlich braucht:
// Wagenreihung/EVNs (coachSequence), Zugläufe (journeys), Bahnhofssuche
// (stopPlace) und Abfahrten für die Liniensuche (boards).
const mainRouter = rpcAppRouter({
	coachSequence: coachSequenceRpcRouter,
	stopPlace: stopPlaceRpcRouter,
	journeys: journeysRpcRouter,
	boards: boardsRpcRouter,
});

export type AppRouter = typeof mainRouter;

export const rpcHttpHandler = createOpenApiHttpHandler({
	router: mainRouter,
	onError: undefined,
	createContext: undefined,
	responseMeta: undefined,
	maxBodySize: undefined,
});

// const doc = generateOpenApiDocument(mainRouter, {
// 	title: 'bahn.expert',
// 	baseUrl: 'https://bahn.expert/api',
// 	version: '0.0.1',
// });
// fs.writeFileSync('./openapi.json', JSON.stringify(doc), 'utf8');

const rpcHandler = createHTTPHandler({
	router: mainRouter,
});

export default eventHandler((event) => {
	// workaround to ensure no other handler (like ssr) gets processed
	event._handled = true;
	return rpcHandler(event.node.req, event.node.res);
});
