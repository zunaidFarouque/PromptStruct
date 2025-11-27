import { StructuralElement } from '@/types';
import { parseControlSyntax, renderPrompt } from '@/utils/syntaxParser';
import { sanitizeElementContent } from './textSanitizer';

export function getProcessedElementContent(
    element: StructuralElement,
    previewMode: 'clean' | 'raw',
    globalControlValues: Record<string, any>
): string {
    if (!element.enabled) {
        return '';
    }

    const baseContent =
        previewMode === 'raw'
            ? element.content
            : renderPrompt(element.content, parseControlSyntax(element.content), globalControlValues);

    const shouldSanitize = (element.autoRemoveEmptyLines ?? true) && previewMode === 'clean';
    const processed = shouldSanitize ? sanitizeElementContent(baseContent) : baseContent;

    return processed.trim().length === 0 ? '' : processed;
}

