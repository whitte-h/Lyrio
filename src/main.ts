import {Editor, Plugin, setIcon} from 'obsidian';
import {DEFAULT_SETTINGS, LyrioSettings, LyrioSettingTab} from "./settings";
import {detectModifiedSection, syncSection, isNewSection, getExistingSectionContent} from "./songHelper";
import {createColorPlugin, getTagColor, refreshEffect} from "./colorPlugin";
import {
	TimestampData,
	getInstanceLineNumbers,
	setInstanceTimestamp,
	shouldSyncSection,
	syncTimestamps,
	copyTimestampToNewInstance,
	cleanupTimestamps,
	findMostRecentInstance,
} from "./timestampManager";

export default class LyrioPlugin extends Plugin {
	settings: LyrioSettings;
	private timestamps: TimestampData = {};
	private lastContent: string = '';
	private syncTimeout: NodeJS.Timeout | null = null;
	private statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new LyrioSettingTab(this.app, this));

		this.statusBarItem = this.addStatusBarItem();
		setIcon(this.statusBarItem, 'refresh-cw');
		this.statusBarItem.addClass('lyrio-status');
		this.statusBarItem.style.display = 'none';

		this.registerEditorExtension(
			createColorPlugin(
				() => this.settings.colorBlocks,
				() => this.settings.useClosingTag,
			)
		);

		this.registerMarkdownPostProcessor((el) => {
			el.querySelectorAll('p').forEach((p) => {
				const text = p.textContent ?? '';
				const m = text.match(/^::(\w+)(\*)?/);
				if (m?.[1]) {
					(p as HTMLElement).style.color = getTagColor(m[1]);
					(p as HTMLElement).style.fontWeight = '600';
				}
			});
		});

		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				this.handleEditorChange(editor);
			})
		);

		this.addCommand({
			id: 'lyrio-show-sections',
			name: 'Show song sections in this note',
			editorCallback: (editor: Editor) => {
				const lines = editor.getDoc().getValue().split('\n');
				const sections = lines
					.map((line, idx) => ({line, idx}))
					.filter(({line}) => line.match(/^::\w+/))
					.map(({line, idx}) => `Line ${idx + 1}: ${line}`);
				console.log('Lyrio sections:', sections.length ? sections : '(none)');
			}
		});
	}

	onunload() {
		if (this.syncTimeout) clearTimeout(this.syncTimeout);
	}

	applySettingsChange() {
		this.lastContent = '';
		this.app.workspace.iterateAllLeaves((leaf) => {
			const cm = (leaf.view as any).editor?.cm;
			if (cm && typeof cm.dispatch === 'function') {
				cm.dispatch({ effects: refreshEffect.of(undefined) });
			}
		});
	}

	private setSyncing(active: boolean) {
		if (!this.statusBarItem) return;
		this.statusBarItem.style.display = active ? '' : 'none';
	}

	private handleEditorChange(editor: Editor) {
		if (!this.settings.autoSyncEnabled) return;

		const currentContent = editor.getDoc().getValue();
		const currentLines = currentContent.split('\n');
		const useClosingTag = this.settings.useClosingTag;

		this.timestamps = cleanupTimestamps(this.timestamps, currentLines);
		this.setSyncing(true);

		if (this.syncTimeout) clearTimeout(this.syncTimeout);

		this.syncTimeout = setTimeout(async () => {
			try {
				const cursorPos = editor.getCursor();
				const modified = detectModifiedSection(this.lastContent, currentContent, useClosingTag);

				if (modified) {
					if (modified.isLocal) {
						this.lastContent = currentContent;
						await this.saveSettings();
						return;
					}

					const allLineNumbers = getInstanceLineNumbers(currentLines, modified.sectionName);
					const isNew = isNewSection(modified.newContent);

					if (isNew) {
						const existingContent = getExistingSectionContent(currentContent, modified.sectionName, useClosingTag);

						if (existingContent) {
							const existingLines = existingContent.split('\n');
							const markerRegex = new RegExp(`^::${modified.sectionName}(\\s+\\[.*?\\])?$`);

							let newSectionLineNum = -1;
							for (let i = 0; i < currentLines.length; i++) {
								const line = currentLines[i];
								if (line && markerRegex.test(line)) {
									let isEmptySection = true;
									for (let j = i + 1; j < currentLines.length && currentLines[j]?.trim() !== ''; j++) {
										const nextLine = currentLines[j];
										if (nextLine && !nextLine.match(/^::\w+/)) {
											isEmptySection = false;
											break;
										}
									}
									if (isEmptySection) {
										newSectionLineNum = i;
										break;
									}
								}
							}

							if (newSectionLineNum !== -1) {
								const beforeLines = currentLines.slice(0, newSectionLineNum);
								const afterLines = currentLines.slice(newSectionLineNum + 1);

								let endIdx = 0;
								while (endIdx < afterLines.length && (afterLines[endIdx]?.trim() ?? '') !== '') {
									endIdx++;
								}

								const updatedContent = [
									...beforeLines,
									...existingLines,
									...afterLines.slice(endIdx),
								].join('\n');

								editor.getDoc().setValue(updatedContent);
								editor.setCursor(cursorPos);

								const existingLineNumbers = getInstanceLineNumbers(currentLines, modified.sectionName);
								const mostRecentLine = findMostRecentInstance(this.timestamps, modified.sectionName, existingLineNumbers);
								if (mostRecentLine !== null) {
									this.timestamps = copyTimestampToNewInstance(
										this.timestamps,
										modified.sectionName,
										mostRecentLine,
										newSectionLineNum
									);
								}

								await this.saveSettings();
								this.lastContent = updatedContent;
								return;
							}
						}
					} else {
						const markerRegex = new RegExp(`^::${modified.sectionName}(\\s+\\[.*?\\])?$`);
						let modifiedSectionLineNum = -1;
						for (let j = cursorPos.line; j >= 0; j--) {
							const line = currentLines[j];
							if (!line || (line.trim() === '' && j < cursorPos.line)) break;
							if (line && markerRegex.test(line)) {
								modifiedSectionLineNum = j;
								break;
							}
						}
						if (modifiedSectionLineNum === -1) {
							modifiedSectionLineNum = allLineNumbers[0] ?? -1;
						}

						if (modifiedSectionLineNum !== -1) {
							const otherLineNumbers = allLineNumbers.filter(ln => ln !== modifiedSectionLineNum);
							const shouldSync = shouldSyncSection(
								this.timestamps,
								modified.sectionName,
								modifiedSectionLineNum,
								otherLineNumbers
							);

							if (shouldSync) {
								const now = Date.now();
								const syncedContent = syncSection(
									currentContent,
									modified.sectionName,
									modified.newContent,
									this.settings.debugMode ? now : undefined,
									useClosingTag,
								);

								if (syncedContent !== currentContent) {
									editor.getDoc().setValue(syncedContent);
									editor.setCursor(cursorPos);

									const newLines = syncedContent.split('\n');
									const allUpdatedLineNumbers = getInstanceLineNumbers(newLines, modified.sectionName);
									this.timestamps = syncTimestamps(
										this.timestamps,
										modified.sectionName,
										modifiedSectionLineNum,
										allUpdatedLineNumbers,
										now
									);

									await this.saveSettings();
									this.lastContent = syncedContent;
									return;
								}
							} else {
								const mostRecentLine = findMostRecentInstance(this.timestamps, modified.sectionName, allLineNumbers);
								if (mostRecentLine !== null && mostRecentLine !== modifiedSectionLineNum) {
									const mostRecentContent = this.extractSectionContentAtLine(currentContent, modified.sectionName, mostRecentLine);
									if (mostRecentContent) {
										const revertedContent = syncSection(currentContent, modified.sectionName, mostRecentContent, undefined, useClosingTag);
										editor.getDoc().setValue(revertedContent);
										editor.setCursor(cursorPos);

										this.timestamps = setInstanceTimestamp(
											this.timestamps,
											modified.sectionName,
											modifiedSectionLineNum,
											this.timestamps[`${modified.sectionName}:${mostRecentLine}`] ?? Date.now()
										);

										await this.saveSettings();
										this.lastContent = revertedContent;
										return;
									}
								}
							}
						}
					}
				}

				this.lastContent = currentContent;
				await this.saveSettings();
			} finally {
				this.setSyncing(false);
			}
		}, 300);
	}

	private extractSectionContentAtLine(content: string, sectionName: string, lineNumber: number): string | null {
		const lines = content.split('\n');
		const line = lines[lineNumber];
		if (line && line.match(new RegExp(`^::${sectionName}(\\s+\\[.*?\\])?$`))) {
			const contentLines: string[] = [line];
			for (let j = lineNumber + 1; j < lines.length; j++) {
				const nextLine = lines[j];
				if (!nextLine || nextLine.trim() === '') break;
				contentLines.push(nextLine);
			}
			return contentLines.join('\n');
		}
		return null;
	}

	async loadSettings() {
		const data = await this.loadData() as {settings?: Partial<LyrioSettings>; timestamps?: TimestampData};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
		this.timestamps = data?.timestamps ?? {};
	}

	async saveSettings() {
		await this.saveData({
			settings: this.settings,
			timestamps: this.timestamps,
		});
	}
}
