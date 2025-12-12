import { requestUrl } from 'obsidian';
import { SummarizeResult } from '../types';
import { BaseProvider, MINDMAP_SYSTEM_PROMPT, createUserPrompt, parseAIResponse } from './base';

export class AnthropicProvider extends BaseProvider {
    name = 'Anthropic Claude';
    type: 'anthropic' = 'anthropic';

    constructor(
        private apiKey: string,
        private model: string,
        private maxTokens: number
    ) {
        super();
    }

    async summarize(text: string, language: string): Promise<SummarizeResult> {
        if (!this.apiKey) {
            throw new Error('Anthropic API key is not configured');
        }

        const response = await requestUrl({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: this.maxTokens,
                system: MINDMAP_SYSTEM_PROMPT,
                messages: [
                    { role: 'user', content: createUserPrompt(text, language) }
                ]
            })
        });

        if (response.status !== 200) {
            throw new Error(`Anthropic API error: ${response.status} - ${response.text}`);
        }

        const data = response.json;
        const content = data.content?.[0]?.text;

        if (!content) {
            throw new Error('No content in Anthropic response');
        }

        return parseAIResponse(content);
    }
}
