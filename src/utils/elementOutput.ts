import { StructuralElement } from '@/types';
import { parseControlSyntax, renderPrompt } from '@/utils/syntaxParser';
import { sanitizeElementContent } from './textSanitizer';
import { useEditorStore } from '@/stores/editorStore';

export function getProcessedElementContent(
    element: StructuralElement,
    previewMode: 'clean' | 'raw',
    globalControlValues: Record<string, any>
): string {
    if (!element.enabled) {
        return '';
    }

    // If element is linked to a variable, use the variable value instead of element.content
    // BUT: if element is temporarily unlinked, use element.content instead
    let contentToProcess = element.content;
    if (element.linkedVariable) {
        const store = useEditorStore.getState();
        const isTemporarilyUnlinked = store.isElementTemporarilyUnlinked(element.id);
        
        if (!isTemporarilyUnlinked) {
            const variableValue = store.getVariable(element.linkedVariable);
            if (variableValue !== undefined) {
                contentToProcess = variableValue;
            }
            // If variable doesn't exist, fallback to element.content
        }
        // If temporarily unlinked, use element.content (already set above)
    }

    const baseContent =
        previewMode === 'raw'
            ? contentToProcess
            : renderPrompt(contentToProcess, parseControlSyntax(contentToProcess), globalControlValues);

    const shouldSanitize = (element.autoRemoveEmptyLines ?? true) && previewMode === 'clean';
    const processed = shouldSanitize ? sanitizeElementContent(baseContent) : baseContent;

    return processed.trim().length === 0 ? '' : processed;
}

