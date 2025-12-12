import { requestUrl } from 'obsidian';
import { SummarizeResult } from '../types';
import { BaseProvider, MINDMAP_SYSTEM_PROMPT, createUserPrompt, parseAIResponse } from './base';

export class GeminiProvider extends BaseProvider {
    name = 'Google Gemini';
    type: 'gemini' = 'gemini';

    constructor(
        private apiKey: string,
        private model: string,
        private maxTokens: number
    ) {
        super();
    }

    async summarize(text: string, language: string): Promise<SummarizeResult> {
        if (!this.apiKey) {
            throw new Error('Gemini API key is not configured');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await requestUrl({
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: `${MINDMAP_SYSTEM_PROMPT}\n\n${createUserPrompt(text, language)}` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: this.maxTokens,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (response.status !== 200) {
            throw new Error(`Gemini API error: ${response.status} - ${response.text}`);
        }

        const data = response.json;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No content in Gemini response');
        }

        return parseAIResponse(content);
    }
}
