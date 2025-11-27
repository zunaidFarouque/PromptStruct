import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StructuralElementCard } from '@/components/StructuralElementCard'
import { StructuralElement } from '@/types'

// Mock the drag-and-drop functionality
vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
}))

vi.mock('@dnd-kit/utilities', () => ({
    CSS: {
        Transform: {
            toString: () => '',
        },
    },
}))

describe('StructuralElementCard', () => {
    const mockElement: StructuralElement = {
        id: 'test-1',
        name: 'Test Element',
        enabled: true,
        content: 'Test content with {{text:Name:Default}} control',
        autoRemoveEmptyLines: true,
    }

    const defaultProps = {
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onToggle: vi.fn(),
        controlValues: {},
        onControlChange: vi.fn(),
        collapsed: { text: false, controls: false },
        onCollapsedChange: vi.fn(),
        starredControls: {},
        starredTextBoxes: [],
        onToggleStarControl: vi.fn(),
        onToggleStarTextBox: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render element name', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        expect(screen.getByText('Test Element')).toBeInTheDocument()
    })

    it('should render content textarea when text is expanded', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        expect(screen.getByDisplayValue('Test content with {{text:Name:Default}} control')).toBeInTheDocument()
    })

    it('should render controls when controls are expanded', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        expect(screen.getByText('Name')).toBeInTheDocument()
    })

    it('should call onUpdate when content changes', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        const textarea = screen.getByDisplayValue('Test content with {{text:Name:Default}} control')
        fireEvent.change(textarea, { target: { value: 'New content' } })
        expect(defaultProps.onUpdate).toHaveBeenCalledWith('test-1', { content: 'New content' })
    })

    it('should call onToggle when switch is clicked', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        const switchElement = screen.getByRole('switch')
        fireEvent.click(switchElement)
        expect(defaultProps.onToggle).toHaveBeenCalledWith('test-1')
    })

    it('should call onDelete when delete option is selected', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Element options'))
        const deleteItem = screen.getByText('Delete element')
        fireEvent.click(deleteItem)
        expect(defaultProps.onDelete).toHaveBeenCalledWith('test-1')
    })

    it('should show disabled state when element is disabled', () => {
        const disabledElement = { ...mockElement, enabled: false }
        render(<StructuralElementCard element={disabledElement} {...defaultProps} />)
        const card = screen.getByText('Test Element').closest('.opacity-50')
        expect(card).toBeInTheDocument()
    })

    it('should show highlighted state when highlighted prop is true', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} highlighted={true} />)
        const card = screen.getByText('Test Element').closest('.ring-2')
        expect(card).toBeInTheDocument()
    })

    it('should call onCollapsedChange when text toggle is clicked', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        const textToggle = screen.getByTitle('Hide text area')
        fireEvent.click(textToggle)
        expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith({ text: true, controls: false })
    })

    it('should call onCollapsedChange when controls toggle is clicked', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        const controlsToggle = screen.getByTitle('Hide dynamic controls')
        fireEvent.click(controlsToggle)
        expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith({ text: false, controls: true })
    })

    it('should toggle auto-remove empty lines from the menu', () => {
        render(<StructuralElementCard element={mockElement} {...defaultProps} />)
        fireEvent.click(screen.getByLabelText('Element options'))
        const menuItem = screen.getByText('Auto-remove empty lines')
        fireEvent.click(menuItem)
        expect(defaultProps.onUpdate).toHaveBeenCalledWith('test-1', { autoRemoveEmptyLines: false })
    })

    it('should handle element with no controls', () => {
        const elementWithoutControls = { ...mockElement, content: 'Simple text without controls' }
        render(<StructuralElementCard element={elementWithoutControls} {...defaultProps} />)
        expect(screen.getByText('Test Element')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Simple text without controls')).toBeInTheDocument()
    })

    it('should handle collapsed state correctly', () => {
        const collapsedProps = { ...defaultProps, collapsed: { text: true, controls: true } }
        render(<StructuralElementCard element={mockElement} {...collapsedProps} />)
        expect(screen.getByText('Test Element')).toBeInTheDocument()
        // Content and controls should not be visible when collapsed
        expect(screen.queryByDisplayValue('Test content with {{text:Name:Default}} control')).not.toBeInTheDocument()
        expect(screen.queryByText('Name')).not.toBeInTheDocument()
    })
})