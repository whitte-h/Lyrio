import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateEffect } from '@codemirror/state';

export const refreshEffect = StateEffect.define<void>();

const TAG_COLORS = [
	'#e06c75',
	'#98c379',
	'#e5c07b',
	'#61afef',
	'#c678dd',
	'#56b6c2',
	'#d19a66',
	'#e8a598',
	'#7ec8e3',
	'#b5cea8',
];

function hashName(name: string): number {
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h * 31 + (name.charCodeAt(i) ?? 0)) & 0xffff;
	}
	return h;
}

export function getTagColor(tagName: string): string {
	return TAG_COLORS[hashName(tagName) % TAG_COLORS.length] ?? '#888888';
}

function isClosingTag(text: string): boolean {
	return /^::\w+(\*)?::/.test(text);
}

function buildDecorations(
	view: EditorView,
	getColorBlocks: () => boolean,
	getUseClosingTag: () => boolean,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const colorBlocks = getColorBlocks();
	const useClosingTag = getUseClosingTag();

	for (const { from, to } of view.visibleRanges) {
		// Scan backward from the visible start to detect a section whose marker
		// is above the viewport.
		let activeColor: string | null = null;
		if (colorBlocks) {
			const startLine = view.state.doc.lineAt(from);
			for (let n = startLine.number - 1; n >= 1; n--) {
				const prev = view.state.doc.line(n);
				if (useClosingTag) {
					if (isClosingTag(prev.text)) break;
				} else {
					if (prev.text.trim() === '') break;
				}
				const m = prev.text.match(/^::(\w+)(\*)?/);
				if (m?.[1] && !isClosingTag(prev.text)) {
					activeColor = getTagColor(m[1]);
					break;
				}
			}
		}

		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			const text = line.text;
			const closing = isClosingTag(text);
			const markerMatch = closing ? null : text.match(/^::(\w+)(\*)?/);

			if (markerMatch?.[1]) {
				activeColor = getTagColor(markerMatch[1]);
				builder.add(line.from, line.from, Decoration.line({
					attributes: { style: `color: ${activeColor}; font-weight: 600;` },
				}));
			} else if (closing) {
				// Color the closing tag the same as its section
				const closeMatch = text.match(/^::(\w+)/);
				const color = closeMatch?.[1] ? getTagColor(closeMatch[1]) : activeColor;
				if (color) {
					builder.add(line.from, line.from, Decoration.line({
						attributes: { style: `color: ${color}; font-weight: 600;` },
					}));
				}
				if (useClosingTag) activeColor = null;
			} else if (useClosingTag ? false : text.trim() === '') {
				activeColor = null;
			} else if (colorBlocks && activeColor !== null) {
				builder.add(line.from, line.from, Decoration.line({
					attributes: { style: `border-left: 3px solid ${activeColor}; padding-left: 4px;` },
				}));
			}

			pos = line.to + 1;
		}
	}

	return builder.finish();
}

export function createColorPlugin(getColorBlocks: () => boolean, getUseClosingTag: () => boolean) {
	class Plugin {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view, getColorBlocks, getUseClosingTag);
		}

		update(update: ViewUpdate) {
			const forceRefresh = update.transactions.some(tr => tr.effects.some(e => e.is(refreshEffect)));
			if (forceRefresh || update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view, getColorBlocks, getUseClosingTag);
			}
		}
	}

	return ViewPlugin.fromClass(Plugin, { decorations: (v: { decorations: DecorationSet }) => v.decorations });
}
