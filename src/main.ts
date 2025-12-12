import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    TFile
} from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, SummarizeResult, AIProviderType } from './types';
import { createProvider } from './providers';
import { MindmapGenerator } from './mindmap-generator';
import { MindmapSummarizerSettingTab } from './settings-tab';
import { MindmapInputModal, MindmapInputOptions } from './input-modal';

export default class MindmapSummarizerPlugin extends Plugin {
    settings: PluginSettings;
    mindmapGenerator: MindmapGenerator;

    async onload() {
        await this.loadSettings();
        this.mindmapGenerator = new MindmapGenerator();

        // Add ribbon icon - Opens input modal
        this.addRibbonIcon('brain', 'Generate Mindmap', async () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const content = activeView.editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                this.openInputModal(content, activeView.file);
            } else {
                new Notice('Please open a markdown file first');
            }
        });

        // Command: Generate mindmap from current note (with modal)
        this.addCommand({
            id: 'generate-mindmap-current',
            name: 'Generate mindmap from current note',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                this.openInputModal(content, view.file);
            }
        });

        // Command: Generate mindmap from selection (with modal)
        this.addCommand({
            id: 'generate-mindmap-selection',
            name: 'Generate mindmap from selection',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select some text first');
                    return;
                }
                this.openInputModal(selection, view.file);
            }
        });

        // Command: Quick generate (uses current settings, no modal)
        this.addCommand({
            id: 'generate-mindmap-quick',
            name: 'Quick generate mindmap (use saved settings)',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                await this.generateMindmapDirect(content, view.file);
            }
        });

        // Command: Generate and insert mindmap at cursor (with modal)
        this.addCommand({
            id: 'generate-mindmap-insert',
            name: 'Generate and insert mindmap at cursor',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection() || editor.getValue();
                if (!selection.trim()) {
                    new Notice('No content to summarize');
                    return;
                }
                this.openInputModalForInsert(editor, selection);
            }
        });

        // Settings tab
        this.addSettingTab(new MindmapSummarizerSettingTab(this.app, this));
    }

    onunload() {
        // Cleanup if needed
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private openInputModal(text: string, sourceFile: TFile | null): void {
        new MindmapInputModal(
            this.app,
            this.settings,
            text,
            async (options: MindmapInputOptions) => {
                await this.generateMindmapWithOptions(text, sourceFile, options);
            }
        ).open();
    }

    private openInputModalForInsert(editor: Editor, text: string): void {
        new MindmapInputModal(
            this.app,
            this.settings,
            text,
            async (options: MindmapInputOptions) => {
                await this.generateAndInsertMindmapWithOptions(editor, text, options);
            }
        ).open();
    }

    private async generateMindmapWithOptions(
        text: string,
        sourceFile: TFile | null,
        options: MindmapInputOptions
    ): Promise<void> {
        const loadingNotice = new Notice('Generating mindmap...', 0);

        try {
            // Create temporary settings with user's choices
            const tempSettings = { ...this.settings };
            tempSettings.selectedProvider = options.provider;
            this.setModelForProvider(tempSettings, options.provider, options.model);

            const provider = createProvider(tempSettings);

            // Build prompt with custom instructions if provided
            const language = options.language;
            const customPrompt = options.customPrompt;

            let finalText = text;
            if (customPrompt) {
                finalText = `${text}\n\n[Additional Instructions: ${customPrompt}]`;
            }

            const result = await provider.summarize(finalText, language);

            loadingNotice.hide();

            // Create mindmap with selected format
            await this.createMindmapNote(result, options.outputFormat, sourceFile);

        } catch (error) {
            loadingNotice.hide();
            console.error('Mindmap generation error:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async generateAndInsertMindmapWithOptions(
        editor: Editor,
        text: string,
        options: MindmapInputOptions
    ): Promise<void> {
        const loadingNotice = new Notice('Generating mindmap...', 0);

        try {
            // Create temporary settings with user's choices
            const tempSettings = { ...this.settings };
            tempSettings.selectedProvider = options.provider;
            this.setModelForProvider(tempSettings, options.provider, options.model);

            const provider = createProvider(tempSettings);

            // Build prompt with custom instructions if provided
            const language = options.language;
            const customPrompt = options.customPrompt;

            let finalText = text;
            if (customPrompt) {
                finalText = `${text}\n\n[Additional Instructions: ${customPrompt}]`;
            }

            const result = await provider.summarize(finalText, language);

            loadingNotice.hide();

            // Generate mindmap content based on selected format
            let mindmapContent: string;
            switch (options.outputFormat) {
                case 'mermaid':
                    mindmapContent = this.mindmapGenerator.generateMermaidMindmap(result);
                    break;
                case 'markdown':
                    mindmapContent = this.mindmapGenerator.generateMarkdownList(result);
                    break;
                case 'markmap':
                    mindmapContent = this.mindmapGenerator.generateMarkmap(result);
                    break;
                default:
                    mindmapContent = this.mindmapGenerator.generateMermaidMindmap(result);
            }

            // Insert at cursor
            const cursor = editor.getCursor();
            editor.replaceRange('\n\n' + mindmapContent + '\n\n', cursor);

            new Notice('Mindmap inserted!');

        } catch (error) {
            loadingNotice.hide();
            console.error('Mindmap generation error:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private setModelForProvider(settings: PluginSettings, provider: AIProviderType, model: string): void {
        switch (provider) {
            case 'openai':
                settings.openaiModel = model;
                break;
            case 'anthropic':
                settings.anthropicModel = model;
                break;
            case 'gemini':
                settings.geminiModel = model;
                break;
            case 'grok':
                settings.grokModel = model;
                break;
        }
    }

    // Direct generation without modal (for quick command)
    private async generateMindmapDirect(text: string, sourceFile: TFile | null): Promise<void> {
        const loadingNotice = new Notice('Generating mindmap...', 0);

        try {
            const provider = createProvider(this.settings);
            const result = await provider.summarize(text, this.settings.language);

            loadingNotice.hide();

            // Show format selection modal
            new MindmapFormatModal(this.app, result, this, sourceFile).open();

        } catch (error) {
            loadingNotice.hide();
            console.error('Mindmap generation error:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    async createMindmapNote(result: SummarizeResult, format: string, sourceFile: TFile | null): Promise<void> {
        let content: string;
        let fileName: string;

        switch (format) {
            case 'mermaid':
                content = this.mindmapGenerator.generateMermaidMindmap(result);
                fileName = `${result.title} - Mindmap.md`;
                break;
            case 'markdown':
                content = this.mindmapGenerator.generateMarkdownList(result);
                fileName = `${result.title} - Summary.md`;
                break;
            case 'markmap':
                content = this.mindmapGenerator.generateMarkmap(result);
                fileName = `${result.title} - Markmap.md`;
                break;
            case 'canvas':
                content = this.mindmapGenerator.generateCanvasJson(result);
                fileName = `${result.title} - Mindmap.canvas`;
                break;
            default:
                content = this.mindmapGenerator.generateMermaidMindmap(result);
                fileName = `${result.title} - Mindmap.md`;
        }

        // Sanitize filename
        fileName = fileName.replace(/[\\/:*?"<>|]/g, '-');

        // Determine folder
        let folder = '';
        if (sourceFile) {
            folder = sourceFile.parent?.path || '';
        }

        const filePath = folder ? `${folder}/${fileName}` : fileName;

        // Check if file exists
        let finalPath = filePath;
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(finalPath)) {
            const ext = format === 'canvas' ? '.canvas' : '.md';
            const baseName = fileName.replace(ext, '');
            finalPath = folder
                ? `${folder}/${baseName} (${counter})${ext}`
                : `${baseName} (${counter})${ext}`;
            counter++;
        }

        await this.app.vault.create(finalPath, content);

        // Open the new file
        const newFile = this.app.vault.getAbstractFileByPath(finalPath);
        if (newFile instanceof TFile) {
            await this.app.workspace.getLeaf().openFile(newFile);
        }

        new Notice(`Created: ${finalPath}`);
    }
}

class MindmapFormatModal extends Modal {
    result: SummarizeResult;
    plugin: MindmapSummarizerPlugin;
    sourceFile: TFile | null;

    constructor(
        app: App,
        result: SummarizeResult,
        plugin: MindmapSummarizerPlugin,
        sourceFile: TFile | null
    ) {
        super(app);
        this.result = result;
        this.plugin = plugin;
        this.sourceFile = sourceFile;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: 'Mindmap Generated!' });
        contentEl.createEl('p', { text: `Title: ${this.result.title}` });
        contentEl.createEl('p', { text: 'Select output format:' });

        const buttonContainer = contentEl.createDiv({ cls: 'mindmap-format-buttons' });

        // Mermaid format button
        const mermaidBtn = buttonContainer.createEl('button', {
            text: 'Mermaid Diagram',
            cls: 'mod-cta'
        });
        mermaidBtn.addEventListener('click', async () => {
            this.close();
            await this.plugin.createMindmapNote(this.result, 'mermaid', this.sourceFile);
        });

        // Markdown list button
        const markdownBtn = buttonContainer.createEl('button', {
            text: 'Markdown List'
        });
        markdownBtn.addEventListener('click', async () => {
            this.close();
            await this.plugin.createMindmapNote(this.result, 'markdown', this.sourceFile);
        });

        // Markmap button
        const markmapBtn = buttonContainer.createEl('button', {
            text: 'Markmap Format'
        });
        markmapBtn.addEventListener('click', async () => {
            this.close();
            await this.plugin.createMindmapNote(this.result, 'markmap', this.sourceFile);
        });

        // Canvas button
        const canvasBtn = buttonContainer.createEl('button', {
            text: 'Canvas'
        });
        canvasBtn.addEventListener('click', async () => {
            this.close();
            await this.plugin.createMindmapNote(this.result, 'canvas', this.sourceFile);
        });

        // Copy to clipboard button
        const copyBtn = buttonContainer.createEl('button', {
            text: 'Copy Mermaid to Clipboard'
        });
        copyBtn.addEventListener('click', async () => {
            const content = this.plugin.mindmapGenerator.generateMermaidMindmap(this.result);
            await navigator.clipboard.writeText(content);
            new Notice('Copied to clipboard!');
        });

        // Add some basic styling
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
