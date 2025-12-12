import { MindmapNode, SummarizeResult } from './types';

export class MindmapGenerator {
    /**
     * Convert SummarizeResult to Obsidian-compatible Mermaid mindmap format
     */
    generateMermaidMindmap(result: SummarizeResult): string {
        const lines: string[] = [];
        lines.push('```mermaid');
        lines.push('mindmap');
        lines.push(`  root((${this.escapeText(result.title)}))`);

        for (const node of result.nodes) {
            this.addMermaidNode(lines, node, 2);
        }

        lines.push('```');
        return lines.join('\n');
    }

    private addMermaidNode(lines: string[], node: MindmapNode, depth: number): void {
        const indent = '  '.repeat(depth);
        lines.push(`${indent}${this.escapeText(node.text)}`);

        if (node.children) {
            for (const child of node.children) {
                this.addMermaidNode(lines, child, depth + 1);
            }
        }
    }

    /**
     * Convert SummarizeResult to Markdown bullet list format
     */
    generateMarkdownList(result: SummarizeResult): string {
        const lines: string[] = [];
        lines.push(`# ${result.title}`);
        lines.push('');

        for (const node of result.nodes) {
            this.addMarkdownNode(lines, node, 0);
        }

        return lines.join('\n');
    }

    private addMarkdownNode(lines: string[], node: MindmapNode, depth: number): void {
        const indent = '  '.repeat(depth);
        const bullet = depth === 0 ? '##' : '-';

        if (depth === 0) {
            lines.push(`${bullet} ${node.text}`);
            lines.push('');
        } else {
            lines.push(`${indent}${bullet} ${node.text}`);
        }

        if (node.children) {
            for (const child of node.children) {
                this.addMarkdownNode(lines, child, depth + 1);
            }
        }
    }

    /**
     * Convert SummarizeResult to Canvas-compatible JSON format
     */
    generateCanvasJson(result: SummarizeResult): string {
        const nodes: CanvasNode[] = [];
        const edges: CanvasEdge[] = [];

        // Create root node
        const rootId = this.generateId();
        nodes.push({
            id: rootId,
            type: 'text',
            text: `# ${result.title}`,
            x: 0,
            y: 0,
            width: 300,
            height: 100,
            color: '1'
        });

        // Create child nodes in a radial layout
        const childCount = result.nodes.length;
        const radius = 400;
        const angleStep = (2 * Math.PI) / childCount;

        result.nodes.forEach((node, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const nodeId = this.addCanvasNodes(nodes, edges, node, x, y, rootId);
        });

        return JSON.stringify({ nodes, edges }, null, 2);
    }

    private addCanvasNodes(
        nodes: CanvasNode[],
        edges: CanvasEdge[],
        node: MindmapNode,
        x: number,
        y: number,
        parentId: string
    ): string {
        const nodeId = this.generateId();

        nodes.push({
            id: nodeId,
            type: 'text',
            text: node.text,
            x: x,
            y: y,
            width: 250,
            height: 60,
            color: '4'
        });

        edges.push({
            id: this.generateId(),
            fromNode: parentId,
            fromSide: 'bottom',
            toNode: nodeId,
            toSide: 'top'
        });

        if (node.children) {
            const childCount = node.children.length;
            const spacing = 150;
            const startX = x - ((childCount - 1) * spacing) / 2;

            node.children.forEach((child, index) => {
                const childX = startX + index * spacing;
                const childY = y + 150;
                this.addCanvasNodes(nodes, edges, child, childX, childY, nodeId);
            });
        }

        return nodeId;
    }

    /**
     * Convert to Markmap format (compatible with obsidian-markmind plugin)
     */
    generateMarkmap(result: SummarizeResult): string {
        const lines: string[] = [];
        lines.push('---');
        lines.push('markmap:');
        lines.push('  colorFreezeLevel: 2');
        lines.push('---');
        lines.push('');
        lines.push(`# ${result.title}`);
        lines.push('');

        for (const node of result.nodes) {
            this.addMarkmapNode(lines, node, 2);
        }

        return lines.join('\n');
    }

    private addMarkmapNode(lines: string[], node: MindmapNode, headingLevel: number): void {
        const prefix = '#'.repeat(Math.min(headingLevel, 6));
        lines.push(`${prefix} ${node.text}`);

        if (node.children) {
            for (const child of node.children) {
                this.addMarkmapNode(lines, child, headingLevel + 1);
            }
        }
    }

    private escapeText(text: string): string {
        // Escape special characters for Mermaid
        return text
            .replace(/\(/g, '［')
            .replace(/\)/g, '］')
            .replace(/"/g, "'")
            .replace(/\n/g, ' ');
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15);
    }
}

interface CanvasNode {
    id: string;
    type: 'text' | 'file' | 'link' | 'group';
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: 'top' | 'bottom' | 'left' | 'right';
    toNode: string;
    toSide: 'top' | 'bottom' | 'left' | 'right';
}
