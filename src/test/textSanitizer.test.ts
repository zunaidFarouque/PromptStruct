import { describe, it, expect } from 'vitest'
import { sanitizeElementContent } from '@/utils/textSanitizer'
import { getProcessedElementContent } from '@/utils/elementOutput'
import { StructuralElement } from '@/types'

describe('sanitizeElementContent', () => {
    it('collapses multiple blank lines into a single empty line', () => {
        const input = 'Line 1\n\n\n\nLine 2'
        expect(sanitizeElementContent(input)).toBe('Line 1\n\nLine 2')
    })

    it('trims leading and trailing blank lines', () => {
        const input = '\n\nLine 1\nLine 2\n\n'
        expect(sanitizeElementContent(input)).toBe('Line 1\nLine 2')
    })

    it('returns empty string when content is empty or whitespace', () => {
        expect(sanitizeElementContent('')).toBe('')
        expect(sanitizeElementContent('   \n \n')).toBe('')
    })
})

describe('getProcessedElementContent', () => {
    const baseElement: StructuralElement = {
        id: 'el-1',
        name: 'Element',
        enabled: true,
        content: 'Line 1\n\n\nLine 2',
        autoRemoveEmptyLines: true,
    }

    it('sanitizes content in clean mode when enabled', () => {
        const result = getProcessedElementContent(baseElement, 'clean', {})
        expect(result).toBe('Line 1\n\nLine 2')
    })

    it('keeps raw content untouched in raw mode', () => {
        const result = getProcessedElementContent(baseElement, 'raw', {})
        expect(result).toBe(baseElement.content)
    })

    it('skips sanitization when option is disabled', () => {
        const element: StructuralElement = { ...baseElement, autoRemoveEmptyLines: false }
        const result = getProcessedElementContent(element, 'clean', {})
        expect(result).toBe(baseElement.content)
    })

    it('returns empty string for disabled elements', () => {
        const element: StructuralElement = { ...baseElement, enabled: false }
        expect(getProcessedElementContent(element, 'clean', {})).toBe('')
    })
})

