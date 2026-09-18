import { useSyncExternalStore } from 'react';

/**
 * Alles hier landet ausschließlich im localStorage des Browsers. Es gibt
 * keinen Server-seitigen Account, kein Tracking und keine Synchronisierung -
 * "privacy first". Export/Import als JSON dient nur als manuelles Backup.
 */

export interface SavedEvn {
	/** Die volle EVN/UIC-Fahrzeugnummer, nur Ziffern. */
	evn: string;
	label?: string;
	savedAt: string;
}

const STORAGE_KEY = 'evnFinder.savedEvns.v1';

function readAll(): SavedEvn[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((e): e is SavedEvn => e && typeof e.evn === 'string');
	} catch {
		return [];
	}
}

function writeAll(evns: SavedEvn[]) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(evns));
	} catch {
		// Storage voll oder deaktiviert (z.B. privater Modus) - Änderungen
		// bleiben dann nur für die aktuelle Sitzung im Speicher.
	}
}

type Listener = () => void;
let cache: SavedEvn[] | null = null;
const listeners = new Set<Listener>();

function getSnapshot(): SavedEvn[] {
	if (!cache) {
		cache = readAll();
	}
	return cache;
}

const emptySnapshot: SavedEvn[] = [];

function getServerSnapshot(): SavedEvn[] {
	return emptySnapshot;
}

function emitChange() {
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function normalizeEvn(evn: string): string {
	return evn.replace(/\D/g, '');
}

export function isEvnSaved(evn: string): boolean {
	const normalized = normalizeEvn(evn);
	return getSnapshot().some((e) => e.evn === normalized);
}

export function saveEvn(evn: string, label?: string) {
	const normalized = normalizeEvn(evn);
	if (!normalized) return;
	const current = getSnapshot();
	if (current.some((e) => e.evn === normalized)) return;
	cache = [
		...current,
		{ evn: normalized, label, savedAt: new Date().toISOString() },
	];
	writeAll(cache);
	emitChange();
}

export function removeEvn(evn: string) {
	cache = getSnapshot().filter((e) => e.evn !== evn);
	writeAll(cache);
	emitChange();
}

export function updateEvnLabel(evn: string, label: string) {
	cache = getSnapshot().map((e) =>
		e.evn === evn ? { ...e, label: label || undefined } : e,
	);
	writeAll(cache);
	emitChange();
}

export function replaceAllEvns(evns: SavedEvn[]) {
	cache = evns;
	writeAll(cache);
	emitChange();
}

export function useSavedEvns(): SavedEvn[] {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
