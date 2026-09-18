export function formatEvn(evn: string): string {
	const digits = evn.replace(/\D/g, '');
	if (digits.length !== 12) return evn;
	// Land(2) Gattung(2) Verwaltung(4) Ordnungsnummer(3) Prüfziffer(1) - grobe,
	// rein optische Gruppierung zur besseren Lesbarkeit.
	return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 11)}-${digits.slice(11)}`;
}

export function formatLine(
	category?: string,
	number?: string | number,
): string {
	if (!category && number === undefined) return '';
	return [category, number]
		.filter((v) => v !== undefined && v !== '')
		.join(' ');
}

export function formatTime(date?: Date | string): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatDateTime(date?: Date | string): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('de-DE', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}
