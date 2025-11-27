import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/stores/editorStore'
import { StructuralElement } from '@/types'

describe('Editor Store', () => {
    beforeEach(() => {
        // Reset store state before each test
        useEditorStore.setState({
            structure: [],
            currentProject: null,
            currentPrompt: null,
            previewMode: 'clean',
            projects: [],
            prompts: [],
            versions: [],
        })
    })

    describe('Structural Elements', () => {
        it('should add structural element', () => {
            const element: StructuralElement = {
                id: 'test-1',
                name: 'Test Element',
                enabled: true,
                content: 'Test content',
                autoRemoveEmptyLines: true,
            }

            useEditorStore.getState().addStructuralElement(element)

            const state = useEditorStore.getState()
            expect(state.structure).toHaveLength(1)
            expect(state.structure[0]).toEqual(element)
        })

        it('should update structural element', () => {
            const element: StructuralElement = {
                id: 'test-1',
                name: 'Test Element',
                enabled: true,
                content: 'Test content',
                autoRemoveEmptyLines: true,
            }

            useEditorStore.getState().addStructuralElement(element)
            useEditorStore.getState().updateStructuralElement('test-1', { name: 'Updated Name' })

            const state = useEditorStore.getState()
            expect(state.structure[0].name).toBe('Updated Name')
            expect(state.structure[0].content).toBe('Test content')
        })

        it('should remove structural element', () => {
            const element: StructuralElement = {
                id: 'test-1',
                name: 'Test Element',
                enabled: true,
                content: 'Test content',
                autoRemoveEmptyLines: true,
            }

            useEditorStore.getState().addStructuralElement(element)
            useEditorStore.getState().removeStructuralElement('test-1')

            const state = useEditorStore.getState()
            expect(state.structure).toHaveLength(0)
        })

        it('should toggle structural element', () => {
            const element: StructuralElement = {
                id: 'test-1',
                name: 'Test Element',
                enabled: true,
                content: 'Test content',
                autoRemoveEmptyLines: true,
            }

            useEditorStore.getState().addStructuralElement(element)
            useEditorStore.getState().toggleStructuralElement('test-1')

            const state = useEditorStore.getState()
            expect(state.structure[0].enabled).toBe(false)
        })

        it('should update structure order', () => {
            const element1: StructuralElement = {
                id: 'test-1',
                name: 'Element 1',
                enabled: true,
                content: 'Content 1',
                autoRemoveEmptyLines: true,
            }
            const element2: StructuralElement = {
                id: 'test-2',
                name: 'Element 2',
                enabled: true,
                content: 'Content 2',
                autoRemoveEmptyLines: true,
            }
        it('should default autoRemoveEmptyLines to true when adding legacy element', () => {
            const element = {
                id: 'legacy-1',
                name: 'Legacy Element',
                enabled: true,
                content: 'Legacy content'
            } as any

            useEditorStore.getState().addStructuralElement(element)

            expect(useEditorStore.getState().structure[0].autoRemoveEmptyLines).toBe(true)
        })

            useEditorStore.getState().addStructuralElement(element1)
            useEditorStore.getState().addStructuralElement(element2)
            useEditorStore.getState().updateStructure([element2, element1])

            const state = useEditorStore.getState()
            expect(state.structure[0].id).toBe('test-2')
            expect(state.structure[1].id).toBe('test-1')
        })
    })

    describe('Preview Mode', () => {
        it('should set preview mode to clean', () => {
            useEditorStore.getState().setPreviewMode('clean')

            const state = useEditorStore.getState()
            expect(state.previewMode).toBe('clean')
        })

        it('should set preview mode to raw', () => {
            useEditorStore.getState().setPreviewMode('raw')

            const state = useEditorStore.getState()
            expect(state.previewMode).toBe('raw')
        })
    })

    describe('Project Management', () => {
        it('should add project', () => {
            const project = {
                id: 'proj-1',
                name: 'Test Project',
                prompts: [],
                tags: ['test'],
                createdAt: '2025-01-01T00:00:00Z'
            }

            useEditorStore.getState().addProject(project)

            const state = useEditorStore.getState()
            expect(state.projects).toHaveLength(1)
            expect(state.projects[0]).toEqual(project)
        })

        it('should update project', () => {
            const project = {
                id: 'proj-1',
                name: 'Test Project',
                prompts: [],
                tags: ['test'],
                createdAt: '2025-01-01T00:00:00Z'
            }

            useEditorStore.getState().addProject(project)
            useEditorStore.getState().updateProject('proj-1', { name: 'Updated Project' })

            const state = useEditorStore.getState()
            expect(state.projects[0].name).toBe('Updated Project')
        })

        it('should delete project', () => {
            const project = {
                id: 'proj-1',
                name: 'Test Project',
                prompts: [],
                tags: ['test'],
                createdAt: '2025-01-01T00:00:00Z'
            }

            useEditorStore.getState().addProject(project)
            useEditorStore.getState().deleteProject('proj-1')

            const state = useEditorStore.getState()
            expect(state.projects).toHaveLength(0)
        })
    })
})
