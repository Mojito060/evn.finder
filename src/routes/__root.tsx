import { HeaderTags } from '@/client/Common/Components/HeaderTags';
import { ThemeHeaderTags } from '@/client/Common/Components/ThemeHeaderTags';
import { HeaderTagProvider } from '@/client/Common/provider/HeaderTagProvider';
import { GlobalCSS } from '@/client/GlobalCSS';
import type { TRPCQueryUtilsType } from '@/router';
import { NoSsr } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
// @ts-expect-error ESM fuckup
import { deDE } from '@mui/x-date-pickers/node/locales/deDE';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
	type AnyRouteMatch,
	Outlet,
	createRootRouteWithContext,
} from '@tanstack/react-router';
import { Meta, Scripts } from '@tanstack/start';
import { de as deLocale } from 'date-fns/locale/de';
import { z } from 'zod';

const RouterDevtoolsConditional =
	process.env.NODE_ENV === 'production'
		? null
		: (await import('@tanstack/router-devtools')).TanStackRouterDevtools;

function RouterDevtools() {
	if (RouterDevtoolsConditional) {
		return <RouterDevtoolsConditional position="bottom-left" />;
	}
	return null;
}

const customDeLocaleText: typeof deDE.components.MuiLocalizationProvider.defaultProps.localeText =
	{
		...deDE.components.MuiLocalizationProvider.defaultProps.localeText,
		clearButtonLabel: 'Jetzt',
	};

// Keine Analytics, kein Tracking-Skript, kein Consent-Banner. Nur die
// Theme-Einstellung wird (lokal, ohne Server-Kontakt) aus localStorage gelesen.
const scripts: AnyRouteMatch['scripts'] = [
	{
		children: `
			var themeMode = localStorage.getItem('mui-mode');
			if (!themeMode || themeMode === 'system') {
				themeMode = 'dark';
				localStorage.setItem('mui-mode', 'dark');
			}
			if (themeMode && document.documentElement) {
				document.documentElement.setAttribute('class', themeMode);
			}
			`,
	},
];

if (import.meta.env.DEV) {
	scripts.push({
		type: 'module',
		children: `import RefreshRuntime from "/_build/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type`,
	});
}

export const Route = createRootRouteWithContext<{
	baseUrl: string;
	trpcUtils: TRPCQueryUtilsType;
}>()({
	validateSearch: z.object({
		noHeader: z.boolean().optional(),
	}),
	head: (ctx) => {
		const image = `https://${ctx.match.context.baseUrl}/android-chrome-384x384.png`;
		return {
			meta: [
				{
					name: 'og:type',
					content: 'website',
				},
				{
					name: 'og:locale',
					content: 'de_DE',
				},
				{
					name: 'og:image',
					content: image,
				},
				{
					charSet: 'UTF-8',
				},
				{
					name: 'viewport',
					content: 'initial-scale=1, width=device-width',
				},
				{
					name: 'robots',
					content: 'all',
				},
				{
					name: 'mobile-web-app-capable',
					content: 'yes',
				},
				{
					name: 'mobile-web-app-status-bar-style',
					content: 'default',
				},
			],
			links: [
				{
					rel: 'stylesheet',
					href: '/roboto.css',
				},
				{
					rel: 'apple-touch-icon',
					sizes: '180x180',
					href: '/apple-touch-icon.png',
				},
				{
					rel: 'mask-icon',
					href: '/safari-pinned.tab.svg',
					color: '#000000',
				},
				{
					rel: 'shortcut icon',
					href: '/favicon.svg',
				},
			],
			scripts,
		};
	},
	component: RootComponent,
});

const testAwareOutlet = process.env.TEST_RUN ? (
	<NoSsr>
		<Outlet />
	</NoSsr>
) : (
	<Outlet />
);

function RootComponent() {
	return (
		<html className="dark" suppressHydrationWarning lang="de">
			<head>
				<Meta />
			</head>
			<body>
				<LocalizationProvider
					dateAdapter={AdapterDateFns}
					adapterLocale={deLocale}
					localeText={customDeLocaleText}
				>
					<GlobalCSS />
					<HeaderTagProvider>
						<ThemeHeaderTags />
						{testAwareOutlet}
						<HeaderTags />
					</HeaderTagProvider>
				</LocalizationProvider>
				{!globalThis.Cypress && (
					<NoSsr>
						<RouterDevtools />
						<ReactQueryDevtools />
					</NoSsr>
				)}
				<Scripts />
			</body>
		</html>
	);
}

export const RootRoute = Route;
