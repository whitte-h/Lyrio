import {App, PluginSettingTab, Setting} from "obsidian";
import LyrioPlugin from "./main";

export interface LyrioSettings {
	autoSyncEnabled: boolean;
	debugMode: boolean;
	colorBlocks: boolean;
	useClosingTag: boolean;
}

export const DEFAULT_SETTINGS: LyrioSettings = {
	autoSyncEnabled: true,
	debugMode: false,
	colorBlocks: false,
	useClosingTag: false,
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
			.setName('Debug mode')
			.setDesc('Show last-synced timestamp next to each section tag')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
					this.plugin.applySettingsChange();
				}));

		containerEl.createEl('div', {
			text: '::Tag — syncs all instances  |  ::Tag* — local only  |  ::Tag:: — closing tag (when enabled)',
			attr: { style: 'margin-top: 20px; padding: 10px; background-color: var(--background-secondary); border-radius: 5px;' }
		});
	}
}
