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

        // Add ribbon icon - Opens input modal and inserts into current note
        this.addRibbonIcon('brain', 'Generate Mindmap', async () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const content = activeView.editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                this.openInputModalForInsert(activeView.editor, content);
            } else {
                new Notice('Please open a markdown file first');
            }
        });

        // Command: Generate mindmap from current note (insert into note)
        this.addCommand({
            id: 'generate-mindmap-current',
            name: 'Generate mindmap from current note',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                this.openInputModalForInsert(editor, content);
            }
        });

        // Command: Generate mindmap from selection (insert into note)
        this.addCommand({
            id: 'generate-mindmap-selection',
            name: 'Generate mindmap from selection',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select some text first');
                    return;
                }
                this.openInputModalForInsert(editor, selection);
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
                await this.quickGenerateAndInsert(editor, content);
            }
        });

        // Command: Generate mindmap to new file
        this.addCommand({
            id: 'generate-mindmap-new-file',
            name: 'Generate mindmap to new file',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                if (!content.trim()) {
                    new Notice('The note is empty');
                    return;
                }
                this.openInputModalForNewFile(content, view.file);
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

    private openInputModalForInsert(editor: Editor, text: string): void {
        new MindmapInputModal(
            this.app,
            this.settings,
            text,
            async (options: MindmapInputOptions) => {
                await this.generateAndInsertMindmap(editor, text, options);
            }
        ).open();
    }

    private openInputModalForNewFile(text: string, sourceFile: TFile | null): void {
        new MindmapInputModal(
            this.app,
            this.settings,
            text,
            async (options: MindmapInputOptions) => {
                await this.generateMindmapToNewFile(text, sourceFile, options);
            }
        ).open();
    }

    private async generateAndInsertMindmap(
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
                case 'canvas':
                    // Canvas needs to be saved as a separate file
                    const activeFile = this.app.workspace.getActiveFile();
                    await this.createCanvasFile(result, activeFile);
                    return;
                default:
                    mindmapContent = this.mindmapGenerator.generateMermaidMindmap(result);
            }

            // Insert at the end of the note
            const currentContent = editor.getValue();
            const separator = '\n\n---\n\n## Mindmap Summary\n\n';
            editor.setValue(currentContent + separator + mindmapContent);

            // Move cursor to end
            const lastLine = editor.lastLine();
            editor.setCursor({ line: lastLine, ch: 0 });

            new Notice('Mindmap inserted!');

        } catch (error) {
            loadingNotice.hide();
            console.error('Mindmap generation error:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async quickGenerateAndInsert(editor: Editor, text: string): Promise<void> {
        const loadingNotice = new Notice('Generating mindmap...', 0);

        try {
            const provider = createProvider(this.settings);
            const result = await provider.summarize(text, this.settings.language);

            loadingNotice.hide();

            // Generate Mermaid mindmap by default
            const mindmapContent = this.mindmapGenerator.generateMermaidMindmap(result);

            // Insert at the end of the note
            const currentContent = editor.getValue();
            const separator = '\n\n---\n\n## Mindmap Summary\n\n';
            editor.setValue(currentContent + separator + mindmapContent);

            // Move cursor to end
            const lastLine = editor.lastLine();
            editor.setCursor({ line: lastLine, ch: 0 });

            new Notice('Mindmap inserted!');

        } catch (error) {
            loadingNotice.hide();
            console.error('Mindmap generation error:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async generateMindmapToNewFile(
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

            // Create mindmap in new file
            await this.createMindmapNote(result, options.outputFormat, sourceFile);

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

    private async createCanvasFile(result: SummarizeResult, sourceFile: TFile | null): Promise<void> {
        const content = this.mindmapGenerator.generateCanvasJson(result);
        let fileName = `${result.title} - Mindmap.canvas`.replace(/[\\/:*?"<>|]/g, '-');

        let folder = '';
        if (sourceFile) {
            folder = sourceFile.parent?.path || '';
        }

        const filePath = folder ? `${folder}/${fileName}` : fileName;

        let finalPath = filePath;
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(finalPath)) {
            const baseName = fileName.replace('.canvas', '');
            finalPath = folder
                ? `${folder}/${baseName} (${counter}).canvas`
                : `${baseName} (${counter}).canvas`;
            counter++;
        }

        await this.app.vault.create(finalPath, content);

        const newFile = this.app.vault.getAbstractFileByPath(finalPath);
        if (newFile instanceof TFile) {
            await this.app.workspace.getLeaf().openFile(newFile);
        }

        new Notice(`Created: ${finalPath}`);
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
