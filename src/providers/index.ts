import { AIProvider, AIProviderType, PluginSettings } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { GrokProvider } from './grok';

export function createProvider(settings: PluginSettings): AIProvider {
    const providerType = settings.selectedProvider;

    switch (providerType) {
        case 'openai':
            return new OpenAIProvider(
                settings.openaiApiKey,
                settings.openaiModel,
                settings.maxTokens
            );

        case 'anthropic':
            return new AnthropicProvider(
                settings.anthropicApiKey,
                settings.anthropicModel,
                settings.maxTokens
            );

        case 'gemini':
            return new GeminiProvider(
                settings.geminiApiKey,
                settings.geminiModel,
                settings.maxTokens
            );

        case 'grok':
            return new GrokProvider(
                settings.grokApiKey,
                settings.grokModel,
                settings.maxTokens
            );

        default:
            throw new Error(`Unknown provider type: ${providerType}`);
    }
}

export function getProviderDisplayName(type: AIProviderType): string {
    const names: Record<AIProviderType, string> = {
        openai: 'OpenAI (GPT)',
        anthropic: 'Anthropic (Claude)',
        gemini: 'Google (Gemini)',
        grok: 'xAI (Grok)'
    };
    return names[type];
}

export { OpenAIProvider, AnthropicProvider, GeminiProvider, GrokProvider };
