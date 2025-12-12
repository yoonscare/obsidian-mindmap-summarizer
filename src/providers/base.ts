import { AIProvider, SummarizeResult } from '../types';

export const MINDMAP_SYSTEM_PROMPT = `You are an expert at analyzing text and creating structured mindmaps.
Your task is to summarize the given text and create a hierarchical mindmap structure.

Rules:
1. Extract the main topic as the title
2. Identify 3-7 main themes/categories
3. Each main theme should have 2-5 sub-points
4. Keep each node text concise (under 50 characters)
5. Maintain logical hierarchy and relationships
6. Focus on key concepts, not details

Output format (JSON):
{
  "title": "Main Topic",
  "nodes": [
    {
      "text": "Main Theme 1",
      "children": [
        { "text": "Sub-point 1.1" },
        { "text": "Sub-point 1.2" }
      ]
    },
    {
      "text": "Main Theme 2",
      "children": [
        { "text": "Sub-point 2.1" },
        { "text": "Sub-point 2.2" }
      ]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or additional text.`;

export function createUserPrompt(text: string, language: string): string {
    return `Please analyze the following text and create a mindmap summary in ${language}.

Text to analyze:
${text}

Remember: Return ONLY valid JSON.`;
}

export function parseAIResponse(response: string): SummarizeResult {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
    }

    const result = JSON.parse(jsonStr);

    if (!result.title || !result.nodes || !Array.isArray(result.nodes)) {
        throw new Error('Invalid mindmap structure in AI response');
    }

    return result as SummarizeResult;
}

export abstract class BaseProvider implements AIProvider {
    abstract name: string;
    abstract type: 'openai' | 'anthropic' | 'gemini' | 'grok';

    abstract summarize(text: string, language: string): Promise<SummarizeResult>;

    protected validateConfig(): void {
        // Override in subclasses if needed
    }
}
