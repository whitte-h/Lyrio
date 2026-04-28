import {App, PluginSettingTab, Setting} from "obsidian";
import LyrioPlugin from "./main";

export interface LyrioSettings {
	autoSyncEnabled: boolean;
	colorBlocks: boolean;
	useClosingTag: boolean;
	exceptionTags: string[];
}

export const DEFAULT_SETTINGS: LyrioSettings = {
	autoSyncEnabled: true,
	colorBlocks: false,
	useClosingTag: false,
	exceptionTags: ['Verse'],
}

export class LyrioSettingTab extends PluginSettingTab {
	plugin: LyrioPlugin;

	constructor(app: App, plugin: LyrioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.createEl('h2', {text: 'Lyrio - Song Helper Settings'});

		new Setting(containerEl)
			.setName('Auto-sync sections')
			.setDesc('Automatically sync all instances of a section when any is edited')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSyncEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autoSyncEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.applySettingsChange();
				}));

		new Setting(containerEl)
			.setName('Use closing tag')
			.setDesc('Delimit sections with ::Tag (open) and ::Tag:: (close) instead of a blank line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useClosingTag)
				.onChange(async (value) => {
					this.plugin.settings.useClosingTag = value;
					await this.plugin.saveSettings();
					this.plugin.applySettingsChange();
				}));

		new Setting(containerEl)
			.setName('Color section blocks')
			.setDesc('Draw a colored left border on lines inside each section block, matching its tag color')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.colorBlocks)
				.onChange(async (value) => {
					this.plugin.settings.colorBlocks = value;
					await this.plugin.saveSettings();
					this.plugin.applySettingsChange();
				}));

		new Setting(containerEl)
			.setName('Exception tags')
			.setDesc('Tags that sync only their bar content (| … |), not body lyrics. Comma-separated.')
			.addText(text => text
				.setPlaceholder('Verse, Bridge, …')
				.setValue(this.plugin.settings.exceptionTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.exceptionTags = value.split(',').map(t => t.trim()).filter(Boolean);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('div', {
			text: '::Tag — syncs all instances  |  ::Tag* — local only  |  ::Tag:: — closing tag (when enabled)',
			attr: { style: 'margin-top: 20px; padding: 10px; background-color: var(--background-secondary); border-radius: 5px;' }
		});
	}
}
