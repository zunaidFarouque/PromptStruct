import { StructuralElement } from '@/types';
import { getProcessedElementContent } from '@/utils/elementOutput';

export interface PreviewPosition {
    start: number;
    end: number;
    elementId: string;
    elementName: string;
}

export interface PreviewMapping {
    positions: PreviewPosition[];
    totalLength: number;
}

/**
 * Creates a mapping between preview text positions and structural elements
 * This allows us to determine which element a piece of text belongs to
 */
export function createPreviewMapping(
    structure: StructuralElement[],
    previewMode: 'clean' | 'raw',
    globalControlValues: Record<string, any>
): PreviewMapping {
    const positions: PreviewPosition[] = [];
    let currentPosition = 0;

    const renderableElements = structure
        .map(element => ({
            element,
            content: getProcessedElementContent(element, previewMode, globalControlValues),
        }))
        .filter(({ content }) => content.length > 0);

    renderableElements.forEach(({ element, content }, index) => {
        const start = currentPosition;
        const end = currentPosition + content.length;

        positions.push({
            start,
            end,
            elementId: element.id,
            elementName: element.name
        });

        currentPosition = end;
        if (index < renderableElements.length - 1) {
            currentPosition += 2; // account for \n\n separator
        }
    });

    return {
        positions,
        totalLength: currentPosition
    };
}

/**
 * Finds which structural element a text position belongs to
 */
export function findElementAtPosition(
    mapping: PreviewMapping,
    position: number
): PreviewPosition | null {
    return mapping.positions.find(pos =>
        position >= pos.start && position < pos.end
    ) || null;
}

/**
 * Creates HTML content with data attributes for hover detection
 */
export function createPreviewHTML(
    structure: StructuralElement[],
    previewMode: 'clean' | 'raw',
    globalControlValues: Record<string, any>
): string {
    const renderableElements = structure
        .map(element => ({
            element,
            content: getProcessedElementContent(element, previewMode, globalControlValues),
        }))
        .filter(({ content }) => content.length > 0);

    if (renderableElements.length === 0) {
        return '<div class="text-center py-8"><div class="text-4xl mb-4">✨</div><p>Your rendered prompt will appear here...</p><small class="text-muted-foreground">Add some elements to get started</small></div>';
    }

    const htmlParts = renderableElements.map(({ element, content }) => {
        // Escape HTML and wrap with data attributes
        const escapedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        return `<span data-element-id="${element.id}" data-element-name="${element.name}">${escapedContent}</span>`;
    });

    return htmlParts.join('\n\n');
}

/**
 * Calculates the cursor position within a textarea element
 */
export function getCursorPosition(textarea: HTMLTextAreaElement): number {
    return textarea.selectionStart;
}

/**
 * Sets the cursor position in a textarea element
 */
export function setCursorPosition(textarea: HTMLTextAreaElement, position: number): void {
    textarea.focus();
    textarea.setSelectionRange(position, position);
}

/**
 * Scrolls an element into view smoothly
 */
export function scrollIntoView(element: HTMLElement): void {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });
}
