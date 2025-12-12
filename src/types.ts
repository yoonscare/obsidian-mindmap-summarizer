// AI Provider Types
export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'grok';

export interface AIProviderConfig {
    type: AIProviderType;
    apiKey?: string;
    baseUrl?: string;
    model: string;
}

export interface MindmapNode {
    text: string;
    children?: MindmapNode[];
}

export interface SummarizeResult {
    title: string;
    nodes: MindmapNode[];
}

export interface AIProvider {
    name: string;
    type: AIProviderType;
    summarize(text: string, language: string): Promise<SummarizeResult>;
}

export interface PluginSettings {
    selectedProvider: AIProviderType;
    openaiApiKey: string;
    openaiModel: string;
    anthropicApiKey: string;
    anthropicModel: string;
    geminiApiKey: string;
    geminiModel: string;
    grokApiKey: string;
    grokModel: string;
    language: string;
    maxTokens: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    selectedProvider: 'gemini',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    anthropicApiKey: '',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    grokApiKey: '',
    grokModel: 'grok-2-latest',
    language: 'Korean',
    maxTokens: 2048
};

export const AVAILABLE_MODELS: Record<AIProviderType, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    gemini: ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-image-05-20', 'gemini-2.5-pro-preview-image-05-20', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    grok: ['grok-2-latest', 'grok-2', 'grok-beta']
};
