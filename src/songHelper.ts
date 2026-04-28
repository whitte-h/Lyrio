import { Editor } from "obsidian";

export interface SectionBlock {
	name: string;
	startLine: number;
	endLine: number;
	content: string;
}

export function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function addTimestampToMarker(markerLine: string, timestamp: number): string {
	const cleanLine = markerLine.replace(/\s*\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]$/, '');
	return `${cleanLine} [${formatTimestamp(timestamp)}]`;
}

export function extractSectionName(markerLine: string): string {
	const match = markerLine.match(/^::(\w+)/);
	return match?.[1] ?? '';
}

function isClosingTag(line: string): boolean {
	return /^::\w+(\*)?::/.test(line);
}

export function extractSections(content: string, useClosingTag = false): SectionBlock[] {
	const lines = content.split('\n');
	const sections: SectionBlock[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		if (!line.match(/^::\w+/)) continue;
		if (isClosingTag(line)) continue;

		const sectionMatch = line.match(/^::(\w+)/);
		if (!sectionMatch?.[1]) continue;
		const sectionName = sectionMatch[1];

		const startLine = i;
		let endLine = i;
		const contentLines: string[] = [line];

		if (useClosingTag) {
			const closingPat = new RegExp(`^::${sectionName}(\\*)?::`);
			for (let j = i + 1; j < lines.length; j++) {
				const next = lines[j];
				if (next === undefined) break;
				if (closingPat.test(next)) {
					contentLines.push(next);
					endLine = j;
					break;
				}
				// Another opening marker = unclosed section, stop before it
				if (next.match(/^::\w+/) && !isClosingTag(next)) {
					break;
				}
				contentLines.push(next);
				endLine = j;
			}
		} else {
			for (let j = i + 1; j < lines.length; j++) {
				const next = lines[j];
				if (next === undefined) break;
				if (next.trim() === '') {
					endLine = j - 1;
					break;
				}
				contentLines.push(next);
				endLine = j;
			}
		}

		sections.push({ name: sectionName, startLine, endLine, content: contentLines.join('\n') });
		i = endLine;
	}

	return sections;
}

export function findSectionInstances(content: string, sectionName: string, useClosingTag = false): SectionBlock[] {
	return extractSections(content, useClosingTag).filter(s => s.name === sectionName);
}

export function isNewSection(sectionContent: string): boolean {
	const lines = sectionContent.split('\n');
	return lines.filter(l => l.trim() !== '' && !l.match(/^::\w+/)).length === 0;
}

export function getExistingSectionContent(content: string, sectionName: string, useClosingTag = false): string | null {
	for (const inst of findSectionInstances(content, sectionName, useClosingTag)) {
		if (!isNewSection(inst.content)) return inst.content;
	}
	return null;
}

export function syncSection(
	content: string,
	sectionName: string,
	newContent: string,
	timestamp?: number,
	useClosingTag = false,
): string {
	const lines = content.split('\n');
	const sections = findSectionInstances(content, sectionName, useClosingTag);
	if (sections.length === 0) return content;

	const newContentLines = newContent.split('\n');

	if (newContentLines[0] !== undefined) {
		if (timestamp !== undefined) {
			newContentLines[0] = addTimestampToMarker(newContentLines[0], timestamp);
		} else {
			newContentLines[0] = newContentLines[0].replace(/\s*\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]$/, '');
		}
	}

	for (const section of [...sections].sort((a, b) => b.startLine - a.startLine)) {
		lines.splice(section.startLine, section.endLine - section.startLine + 1, ...newContentLines);
	}

	return lines.join('\n');
}

export function detectModifiedSection(
	oldContent: string,
	newContent: string,
	useClosingTag = false,
): { sectionName: string; newContent: string; isLocal: boolean } | null {
	const oldLines = oldContent.split('\n');
	const newLines = newContent.split('\n');
	const maxLines = Math.max(oldLines.length, newLines.length);

	for (let i = 0; i < maxLines; i++) {
		if ((oldLines[i] ?? '') === (newLines[i] ?? '')) continue;

		for (let j = i; j >= 0; j--) {
			const line = newLines[j] ?? '';
			const closing = isClosingTag(line);

			if (j < i) {
				if (!useClosingTag && line.trim() === '') return null;
				if (closing) return null; // crossed a section boundary
			}

			if (!closing) {
				const m = line.match(/^::(\w+)(\*)?/);
				if (m?.[1]) {
					const sectionName = m[1];
					const isLocal = m[2] === '*';
					let end: number;
					if (useClosingTag) {
						const closingPat = new RegExp(`^::${sectionName}(\\*)?::`);
						const idx = newLines.findIndex((l, k) => k > j && closingPat.test(l));
						end = idx === -1 ? newLines.length : idx + 1;
					} else {
						const idx = newLines.findIndex((l, k) => k > j && l.trim() === '');
						end = idx === -1 ? newLines.length : idx;
					}
					return { sectionName, newContent: newLines.slice(j, end).join('\n'), isLocal };
				}
			}
		}
		return null;
	}

	return null;
}

export async function applySectionSync(editor: Editor, sectionName: string, newContent: string): Promise<void> {
	const doc = editor.getDoc();
	const current = doc.getValue();
	const synced = syncSection(current, sectionName, newContent);
	if (synced !== current) doc.setValue(synced);
}
