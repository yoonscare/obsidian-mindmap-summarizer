import {
    App,
    Modal,
    Setting,
    DropdownComponent,
    TextAreaComponent,
    ButtonComponent,
    Notice
} from 'obsidian';
import { AIProviderType, AVAILABLE_MODELS, PluginSettings } from './types';
import { getProviderDisplayName } from './providers';

export interface MindmapInputOptions {
    provider: AIProviderType;
    model: string;
    language: string;
    outputFormat: 'mermaid' | 'markdown' | 'markmap' | 'canvas';
    customPrompt: string;
}

export class MindmapInputModal extends Modal {
    private settings: PluginSettings;
    private sourceText: string;
    private onSubmit: (options: MindmapInputOptions) => void;

    // Form state
    private selectedProvider: AIProviderType;
    private selectedModel: string;
    private selectedLanguage: string;
    private selectedFormat: 'mermaid' | 'markdown' | 'markmap' | 'canvas';
    private customPrompt: string;

    // UI Components
    private modelDropdown: DropdownComponent | null = null;

    constructor(
        app: App,
        settings: PluginSettings,
        sourceText: string,
        onSubmit: (options: MindmapInputOptions) => void
    ) {
        super(app);
        this.settings = settings;
        this.sourceText = sourceText;
        this.onSubmit = onSubmit;

        // Initialize with current settings
        this.selectedProvider = settings.selectedProvider;
        this.selectedModel = this.getCurrentModel(settings.selectedProvider);
        this.selectedLanguage = settings.language;
        this.selectedFormat = 'mermaid';
        this.customPrompt = '';
    }

    private getCurrentModel(provider: AIProviderType): string {
        switch (provider) {
            case 'openai': return this.settings.openaiModel;
            case 'anthropic': return this.settings.anthropicModel;
            case 'gemini': return this.settings.geminiModel;
            case 'grok': return this.settings.grokModel;
            default: return AVAILABLE_MODELS[provider][0];
        }
    }

    private hasApiKey(provider: AIProviderType): boolean {
        switch (provider) {
            case 'openai': return !!this.settings.openaiApiKey;
            case 'anthropic': return !!this.settings.anthropicApiKey;
            case 'gemini': return !!this.settings.geminiApiKey;
            case 'grok': return !!this.settings.grokApiKey;
            default: return false;
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('mindmap-input-modal');

        // Title
        contentEl.createEl('h2', { text: 'Generate Mindmap' });

        // Source text preview
        const previewContainer = contentEl.createDiv({ cls: 'mindmap-source-preview' });
        previewContainer.createEl('h4', { text: 'Source Text Preview' });
        const previewText = this.sourceText.length > 500
            ? this.sourceText.substring(0, 500) + '...'
            : this.sourceText;
        previewContainer.createEl('p', {
            text: previewText,
            cls: 'mindmap-preview-text'
        });
        previewContainer.createEl('small', {
            text: `Total: ${this.sourceText.length} characters`,
            cls: 'mindmap-char-count'
        });

        // Provider Selection
        new Setting(contentEl)
            .setName('AI Provider')
            .setDesc('Select the AI service to use')
            .addDropdown(dropdown => {
                const providers: AIProviderType[] = ['openai', 'anthropic', 'gemini', 'grok'];
                providers.forEach(provider => {
                    const hasKey = this.hasApiKey(provider);
                    const label = `${getProviderDisplayName(provider)}${hasKey ? '' : ' (No API Key)'}`;
                    dropdown.addOption(provider, label);
                });
                dropdown
                    .setValue(this.selectedProvider)
                    .onChange((value: AIProviderType) => {
                        this.selectedProvider = value;
                        this.selectedModel = this.getCurrentModel(value);
                        this.updateModelDropdown();
                    });
            });

        // Model Selection
        new Setting(contentEl)
            .setName('Model')
            .setDesc('Select the specific model')
            .addDropdown(dropdown => {
                this.modelDropdown = dropdown;
                this.updateModelDropdown();
            });

        // Language Selection
        new Setting(contentEl)
            .setName('Output Language')
            .setDesc('Language for the mindmap content')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('Korean', '한국어')
                    .addOption('English', 'English')
                    .addOption('Japanese', '日本語')
                    .addOption('Chinese', '中文')
                    .addOption('Spanish', 'Español')
                    .addOption('French', 'Français')
                    .addOption('German', 'Deutsch')
                    .setValue(this.selectedLanguage)
                    .onChange(value => {
                        this.selectedLanguage = value;
                    });
            });

        // Output Format Selection
        new Setting(contentEl)
            .setName('Output Format')
            .setDesc('Choose the mindmap format')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('mermaid', 'Mermaid Diagram')
                    .addOption('markdown', 'Markdown List')
                    .addOption('markmap', 'Markmap Format')
                    .addOption('canvas', 'Obsidian Canvas')
                    .setValue(this.selectedFormat)
                    .onChange((value: 'mermaid' | 'markdown' | 'markmap' | 'canvas') => {
                        this.selectedFormat = value;
                    });
            });

        // Custom Prompt (Optional)
        const customPromptSetting = new Setting(contentEl)
            .setName('Custom Instructions (Optional)')
            .setDesc('Add specific instructions for the AI');

        const promptContainer = contentEl.createDiv({ cls: 'mindmap-prompt-container' });
        const promptTextArea = new TextAreaComponent(promptContainer);
        promptTextArea
            .setPlaceholder('e.g., Focus on technical aspects, Include examples, Use simple language...')
            .setValue(this.customPrompt)
            .onChange(value => {
                this.customPrompt = value;
            });
        promptTextArea.inputEl.rows = 3;
        promptTextArea.inputEl.addClass('mindmap-custom-prompt');

        // Action Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'mindmap-button-container' });

        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => {
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText('Generate Mindmap')
            .setCta()
            .onClick(() => {
                this.handleSubmit();
            });
    }

    private updateModelDropdown() {
        if (!this.modelDropdown) return;

        // Clear existing options
        this.modelDropdown.selectEl.empty();

        // Add models for selected provider
        const models = AVAILABLE_MODELS[this.selectedProvider];
        models.forEach(model => {
            this.modelDropdown!.addOption(model, model);
        });

        // Set current value
        this.modelDropdown.setValue(this.selectedModel);

        // Update onChange handler
        this.modelDropdown.onChange(value => {
            this.selectedModel = value;
        });
    }

    private handleSubmit() {
        // Validate API key
        if (!this.hasApiKey(this.selectedProvider)) {
            new Notice(`Please configure ${getProviderDisplayName(this.selectedProvider)} API key in settings first.`);
            return;
        }

        // Validate source text
        if (!this.sourceText.trim()) {
            new Notice('No text to summarize');
            return;
        }

        const options: MindmapInputOptions = {
            provider: this.selectedProvider,
            model: this.selectedModel,
            language: this.selectedLanguage,
            outputFormat: this.selectedFormat,
            customPrompt: this.customPrompt
        };

        this.close();
        this.onSubmit(options);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
