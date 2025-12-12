import { requestUrl } from 'obsidian';
import { SummarizeResult } from '../types';
import { BaseProvider, MINDMAP_SYSTEM_PROMPT, createUserPrompt, parseAIResponse } from './base';

export class GrokProvider extends BaseProvider {
    name = 'xAI Grok';
    type: 'grok' = 'grok';

    constructor(
        private apiKey: string,
        private model: string,
        private maxTokens: number
    ) {
        super();
    }

    async summarize(text: string, language: string): Promise<SummarizeResult> {
        if (!this.apiKey) {
            throw new Error('Grok API key is not configured');
        }

        const response = await requestUrl({
            url: 'https://api.x.ai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: MINDMAP_SYSTEM_PROMPT },
                    { role: 'user', content: createUserPrompt(text, language) }
                ],
                max_tokens: this.maxTokens,
                temperature: 0.7
            })
        });

        if (response.status !== 200) {
            throw new Error(`Grok API error: ${response.status} - ${response.text}`);
        }

        const data = response.json;
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in Grok response');
        }

        return parseAIResponse(content);
    }
}
