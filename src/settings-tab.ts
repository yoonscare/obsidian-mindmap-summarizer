import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import MindmapSummarizerPlugin from './main';
import { AIProviderType, AVAILABLE_MODELS, PluginSettings } from './types';
import { getProviderDisplayName } from './providers';

export class MindmapSummarizerSettingTab extends PluginSettingTab {
    plugin: MindmapSummarizerPlugin;

    constructor(app: App, plugin: MindmapSummarizerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: 'Mindmap Summarizer Settings' });

        // Provider Selection
        containerEl.createEl('h2', { text: 'AI Provider' });

        new Setting(containerEl)
            .setName('Select AI Provider')
            .setDesc('Choose which AI service to use for summarization')
            .addDropdown(dropdown => {
                const providers: AIProviderType[] = ['openai', 'anthropic', 'gemini', 'grok'];
                providers.forEach(provider => {
                    dropdown.addOption(provider, getProviderDisplayName(provider));
                });
                dropdown
                    .setValue(this.plugin.settings.selectedProvider)
                    .onChange(async (value: AIProviderType) => {
                        this.plugin.settings.selectedProvider = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show relevant settings
                    });
            });

        // Language Setting
        new Setting(containerEl)
            .setName('Output Language')
            .setDesc('Language for the mindmap content')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('Korean', '한국어')
                    .addOption('English', 'English')
                    .addOption('Japanese', '日本語')
                    .addOption('Chinese', '中文')
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('Maximum number of tokens for AI response')
            .addSlider(slider => {
                slider
                    .setLimits(512, 4096, 256)
                    .setValue(this.plugin.settings.maxTokens)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.maxTokens = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Provider-specific settings
        this.displayProviderSettings(containerEl);
    }

    private displayProviderSettings(containerEl: HTMLElement): void {
        const provider = this.plugin.settings.selectedProvider;

        containerEl.createEl('h2', { text: `${getProviderDisplayName(provider)} Settings` });

        switch (provider) {
            case 'openai':
                this.displayOpenAISettings(containerEl);
                break;
            case 'anthropic':
                this.displayAnthropicSettings(containerEl);
                break;
            case 'gemini':
                this.displayGeminiSettings(containerEl);
                break;
            case 'grok':
                this.displayGrokSettings(containerEl);
                break;
        }
    }

    private displayOpenAISettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your OpenAI API key')
            .addText(text => {
                text
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.openaiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select OpenAI model')
            .addDropdown(dropdown => {
                AVAILABLE_MODELS.openai.forEach(model => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.plugin.settings.openaiModel)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiModel = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.addApiKeyHelp(containerEl, 'https://platform.openai.com/api-keys');
    }

    private displayAnthropicSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your Anthropic API key')
            .addText(text => {
                text
                    .setPlaceholder('sk-ant-...')
                    .setValue(this.plugin.settings.anthropicApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select Anthropic Claude model')
            .addDropdown(dropdown => {
                AVAILABLE_MODELS.anthropic.forEach(model => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.plugin.settings.anthropicModel)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicModel = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.addApiKeyHelp(containerEl, 'https://console.anthropic.com/settings/keys');
    }

    private displayGeminiSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your Google AI Studio API key')
            .addText(text => {
                text
                    .setPlaceholder('AIza...')
                    .setValue(this.plugin.settings.geminiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select Gemini model')
            .addDropdown(dropdown => {
                AVAILABLE_MODELS.gemini.forEach(model => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.plugin.settings.geminiModel)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiModel = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.addApiKeyHelp(containerEl, 'https://aistudio.google.com/app/apikey');
    }

    private displayGrokSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your xAI API key')
            .addText(text => {
                text
                    .setPlaceholder('xai-...')
                    .setValue(this.plugin.settings.grokApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.grokApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select Grok model')
            .addDropdown(dropdown => {
                AVAILABLE_MODELS.grok.forEach(model => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.plugin.settings.grokModel)
                    .onChange(async (value) => {
                        this.plugin.settings.grokModel = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.addApiKeyHelp(containerEl, 'https://console.x.ai/');
    }

    private addApiKeyHelp(containerEl: HTMLElement, url: string): void {
        const helpEl = containerEl.createEl('div', { cls: 'setting-item-description' });
        helpEl.innerHTML = `Get your API key from: <a href="${url}">${url}</a>`;
    }
}
