import { StructuralElementCard, StructuralElementCardRef } from './StructuralElementCard';
import { useEditorStore } from '@/stores/editorStore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StructuralElement } from '@/types';
import { useEffect, useState, useRef } from 'react';
import { renderPrompt, parseControlSyntax } from '@/utils/syntaxParser';
import { useNavigate } from 'react-router-dom';
import { NotificationService } from '@/services/notificationService';
import { useKeyboardShortcuts, CommonShortcuts } from '@/services/keyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Save, Download, Copy, Plus } from 'lucide-react';
import { TopBar } from './TopBar';
import { ExportOptionsModal } from './ExportOptionsModal';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function MainLayout() {
    const {
        structure,
        previewMode,
        setPreviewMode,
        updateStructuralElement,
        addStructuralElement,
        removeStructuralElement,
        toggleStructuralElement,
        updateStructure,
        currentProject,
        currentPrompt,
        saveCurrentPrompt,
        cleanupOldAutoSaves,
        uiCollapsedByElementId,
        uiGlobalControlValues,
        setUiCollapsedForElement,
        setUiGlobalControlValues,
        editorPanels,
        setEditorPanels,
        versions,
        starredControls,
        starredTextBoxes,
        toggleStarControl,
        toggleStarTextBox
    } = useEditorStore();

    const [showExportModal, setShowExportModal] = useState(false);
    const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
    const [deleteElementId, setDeleteElementId] = useState<string | null>(null);

    // Refs for structural element cards
    const elementCardRefs = useRef<Record<string, StructuralElementCardRef>>({});
    const panelGroupRef = useRef<any>(null);

    const navigate = useNavigate();

    // Clean up old auto-saves on component mount
    useEffect(() => {
        cleanupOldAutoSaves();
    }, [cleanupOldAutoSaves]);

    const handleSave = () => {
        try {
            saveCurrentPrompt(false); // Manual save
            NotificationService.promptSaved(currentPrompt?.name || 'Untitled');
        } catch (error) {
            NotificationService.saveError(`Save failed: ${error}`);
        }
    };

    const handleCopyPrompt = () => {
        const renderedPrompt = renderPreviewForCopy();
        navigator.clipboard.writeText(renderedPrompt).then(() => {
            NotificationService.success('Prompt copied to clipboard!');
        }).catch(() => {
            NotificationService.error('Failed to copy prompt');
        });
    };

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            ...CommonShortcuts.SAVE,
            action: handleSave
        },
        {
            ...CommonShortcuts.NEW_PROMPT,
            action: () => {
                addStructuralElement({
                    name: 'New Element',
                    enabled: true,
                    content: 'Enter your content here...'
                });
            }
        },
        {
            key: 'c',
            ctrlKey: true,
            action: handleCopyPrompt,
            description: 'Copy prompt to clipboard'
        },
        {
            key: 'Escape',
            action: () => navigate('/browser'),
            description: 'Go back to browser'
        }
    ]);

    // Auto-save functionality
    useEffect(() => {
        if (!currentPrompt) return;

        const autoSaveInterval = setInterval(() => {
            try {
                saveCurrentPrompt(true); // Auto-save
                NotificationService.autoSaveSuccess();
            } catch (error) {
                NotificationService.saveError(`Auto-save failed: ${error}`);
            }
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [currentPrompt, structure, saveCurrentPrompt]);

    // Clean up auto-saves periodically to prevent accumulation
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            cleanupOldAutoSaves();
        }, 300000); // Clean up every 5 minutes

        return () => clearInterval(cleanupInterval);
    }, [cleanupOldAutoSaves]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = structure.findIndex((item) => item.id === active.id);
            const newIndex = structure.findIndex((item) => item.id === over.id);

            updateStructure(arrayMove(structure, oldIndex, newIndex));
        }
    };

    const handleAddElement = () => {
        const newElement: StructuralElement = {
            id: `element_${Date.now()}`,
            name: 'New Element',
            enabled: true,
            content: 'Enter your prompt content here...'
        };
        addStructuralElement(newElement);
    };

    const handleDeleteElement = (elementId: string) => {
        setDeleteElementId(elementId);
    };

    const handleConfirmDeleteElement = () => {
        if (deleteElementId) {
            removeStructuralElement(deleteElementId);
            setDeleteElementId(null);
            NotificationService.success('Element deleted successfully');
        }
    };

    const handleExportPrompt = (options: any) => {
        try {
            let exportData: any;
            let filename: string;

            // Get UI state for current prompt
            const storeState = useEditorStore.getState();
            const promptUIState = currentPrompt ? storeState.promptUIStates[currentPrompt.id] : undefined;

            if (options.scope === 'current') {
                // Export current version only (structure state)
                exportData = {
                    prompt: currentPrompt,
                    structure: structure,
                    uiState: promptUIState ? {
                        starredControls: promptUIState.starredControls,
                        starredTextBoxes: promptUIState.starredTextBoxes,
                        globalControlValues: promptUIState.uiGlobalControlValues,
                        collapsedByElementId: promptUIState.uiCollapsedByElementId,
                        uiMiniEditorCollapsed: promptUIState.uiMiniEditorCollapsed,
                    } : undefined,
                    exportedAt: new Date().toISOString(),
                    version: 'current'
                };
                filename = `${currentPrompt?.name || 'untitled'}_current.json`;
            } else if (options.scope === 'last') {
                // Export last saved version (most recent non-autosave)
                const allVersions = versions.filter(v => v.promptId === currentPrompt?.id && !v.isAutoSave);
                const lastVersion = allVersions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                
                exportData = {
                    prompt: currentPrompt,
                    versions: lastVersion ? [lastVersion] : [],
                    currentStructure: structure,
                    uiState: promptUIState ? {
                        starredControls: promptUIState.starredControls,
                        starredTextBoxes: promptUIState.starredTextBoxes,
                        globalControlValues: promptUIState.uiGlobalControlValues,
                        collapsedByElementId: promptUIState.uiCollapsedByElementId,
                        uiMiniEditorCollapsed: promptUIState.uiMiniEditorCollapsed,
                    } : undefined,
                    exportedAt: new Date().toISOString(),
                    version: 'last'
                };
                filename = `${currentPrompt?.name || 'untitled'}_last_version.json`;
            } else {
                // Export all versions (excluding autosaves)
                const promptVersions = versions.filter(v => v.promptId === currentPrompt?.id && !v.isAutoSave);
                exportData = {
                    prompt: currentPrompt,
                    versions: promptVersions,
                    currentStructure: structure,
                    uiState: promptUIState ? {
                        starredControls: promptUIState.starredControls,
                        starredTextBoxes: promptUIState.starredTextBoxes,
                        globalControlValues: promptUIState.uiGlobalControlValues,
                        collapsedByElementId: promptUIState.uiCollapsedByElementId,
                        uiMiniEditorCollapsed: promptUIState.uiMiniEditorCollapsed,
                    } : undefined,
                    exportedAt: new Date().toISOString(),
                    version: 'all'
                };
                filename = `${currentPrompt?.name || 'untitled'}_all_versions.json`;
            }

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            NotificationService.success(`Prompt exported successfully!`);
        } catch (error) {
            NotificationService.error(`Export failed: ${error}`);
        }
    };

    const handleGlobalControlChange = (name: string, value: any) => {
        setUiGlobalControlValues({ ...uiGlobalControlValues, [name]: value });
    };

    const handlePreviewDoubleClick = (elementId: string) => {
        const element = structure.find(el => el.id === elementId);
        if (!element) return;

        const currentCollapsed = uiCollapsedByElementId[elementId] || { text: true, controls: true };
        const isTextCollapsed = currentCollapsed.text;

        if (isTextCollapsed) {
            setUiCollapsedForElement(elementId, {
                text: false,
                controls: currentCollapsed.controls,
                lastExpandedState: { text: true, controls: currentCollapsed.controls }
            });
        }

        const elementCard = document.querySelector(`[data-element-card-id="${elementId}"]`) as HTMLElement;
        if (elementCard) {
            elementCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }

        const elementCardRef = elementCardRefs.current[elementId];
        if (elementCardRef) {
            const delay = isTextCollapsed ? 300 : 100;
            setTimeout(() => {
                elementCardRef.focusTextarea();
                elementCardRef.setTextareaSelectionRange(0, 0);
            }, delay);
        }
    };

    const renderPreviewForCopy = () => {
        const enabledElements = structure.filter(el => el.enabled);

        if (enabledElements.length === 0) {
            return '';
        }

        const renderedContent = enabledElements.map(element => {
            let elementContent: string;

            if (previewMode === 'raw') {
                elementContent = element.content;
            } else {
                const controls = parseControlSyntax(element.content);
                elementContent = renderPrompt(element.content, controls, uiGlobalControlValues);
            }

            return elementContent;
        }).join('\n\n');

        return renderedContent;
    };

    const renderPreview = () => {
        const enabledElements = structure.filter(el => el.enabled);

        if (enabledElements.length === 0) {
            return '';
        }

        const renderedContent = enabledElements.map(element => {
            let elementContent: string;

            if (previewMode === 'raw') {
                elementContent = element.content;
            } else {
                const controls = parseControlSyntax(element.content);
                elementContent = renderPrompt(element.content, controls, uiGlobalControlValues);
            }

            // Escape HTML and wrap with data attributes
            const escapedContent = elementContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\n/g, '<br>'); // Convert line breaks to <br> tags for HTML display

            return `<span data-element-id="${element.id}" data-element-name="${element.name}">${escapedContent}</span>`;
        }).join('\n\n');

        return renderedContent;
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
            <TopBar
                title="PromptStruct"
                subtitle={currentProject && currentPrompt ? `${currentProject.name} → ${currentPrompt.name}` : undefined}
                showBackButton={true}
                onBackClick={() => navigate('/browser')}
                additionalButtons={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            title="Save"
                        >
                            <Save className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowExportModal(true)}
                            title="Export"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </>
                }
            />

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup ref={panelGroupRef} direction="horizontal" autoSaveId="editor-layout" onLayout={(sizes) => {
                    if (sizes[0] < 8 && editorPanels.showStructure) setEditorPanels({ showStructure: false });
                    if (sizes[1] < 8 && editorPanels.showPreview) setEditorPanels({ showPreview: false });
                    if (sizes[2] < 8 && editorPanels.showHelp) setEditorPanels({ showHelp: false });
                }}>
                    {/* Structure Panel */}
                    <ResizablePanel defaultSize={30} minSize={8} collapsible onCollapse={() => setEditorPanels({ showStructure: false })} onExpand={() => setEditorPanels({ showStructure: true })}>
                        <div className="h-full border-r panel-padding flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">
                                    Structure
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext items={structure.map(el => el.id)} strategy={verticalListSortingStrategy}>
                                            <div className="structure-gap">
                                                {structure.length === 0 ? (
                                                    <p className="text-muted-foreground text-sm">
                                                        No structural elements yet. Add one to get started.
                                                    </p>
                                                ) : (
                                                    structure.map((element) => (
                                                        <StructuralElementCard
                                                            key={element.id}
                                                            ref={(ref) => {
                                                                if (ref) {
                                                                    elementCardRefs.current[element.id] = ref;
                                                                }
                                                            }}
                                                            element={element}
                                                            onUpdate={updateStructuralElement}
                                                            onDelete={handleDeleteElement}
                                                            onToggle={toggleStructuralElement}
                                                            controlValues={uiGlobalControlValues}
                                                            onControlChange={handleGlobalControlChange}
                                                            collapsed={uiCollapsedByElementId[element.id] || { text: true, controls: true }}
                                                            onCollapsedChange={(collapsed) => setUiCollapsedForElement(element.id, collapsed)}
                                                            highlighted={highlightedElementId === element.id}
                                                            starredControls={starredControls}
                                                            starredTextBoxes={starredTextBoxes}
                                                            onToggleStarControl={toggleStarControl}
                                                            onToggleStarTextBox={toggleStarTextBox}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                            <div className="flex-shrink-0 mt-4">
                                <Button
                                    onClick={handleAddElement}
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Element
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Preview Panel */}
                    <ResizablePanel defaultSize={editorPanels.showHelp ? 50 : 70} minSize={20} collapsible onCollapse={() => setEditorPanels({ showPreview: false })} onExpand={() => setEditorPanels({ showPreview: true })}>
                        <div className="h-full panel-padding flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">
                                    Preview
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setPreviewMode('clean')}
                                        variant={previewMode === 'clean' ? 'default' : 'outline'}
                                    >
                                        Clean
                                    </Button>
                                    <Button
                                        onClick={() => setPreviewMode('raw')}
                                        variant={previewMode === 'raw' ? 'default' : 'outline'}
                                    >
                                        Raw
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    <div
                                        className="whitespace-pre-wrap font-mono text-sm p-3 bg-muted/50 rounded-md min-h-[400px]"
                                        onMouseMove={(e) => {
                                            const target = e.target as HTMLElement;
                                            const elementSpan = target.closest('[data-element-id]') as HTMLElement;
                                            if (elementSpan) {
                                                const elementId = elementSpan.getAttribute('data-element-id');
                                                setHighlightedElementId(elementId);
                                            }
                                        }}
                                        onMouseLeave={() => setHighlightedElementId(null)}
                                        onDoubleClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            const elementSpan = target.closest('[data-element-id]') as HTMLElement;
                                            if (elementSpan) {
                                                const elementId = elementSpan.getAttribute('data-element-id');
                                                if (elementId) {
                                                    handlePreviewDoubleClick(elementId);
                                                }
                                            }
                                        }}
                                    >
                                        {structure.length === 0 ? (
                                            <div className="text-center py-8">
                                                <div className="text-4xl mb-4">✨</div>
                                                <p>Your rendered prompt will appear here...</p>
                                                <small className="text-muted-foreground">Add some elements to get started</small>
                                            </div>
                                        ) : (
                                            <div dangerouslySetInnerHTML={{ __html: renderPreview() }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 mt-4">
                                <Button
                                    onClick={handleCopyPrompt}
                                    disabled={structure.length === 0}
                                    className="w-full"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Prompt
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Help Panel */}
                    <ResizablePanel defaultSize={20} minSize={8} collapsible onCollapse={() => setEditorPanels({ showHelp: false })} onExpand={() => setEditorPanels({ showHelp: true })}>
                        <div className="h-full border-l panel-padding overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">
                                    Help
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">📝 Edit Elements</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Click on any element in the left panel to edit its content.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">🎛️ Control Syntax</h4>
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <Kbd className="w-fit whitespace-nowrap">{'{{text:Name:Default}}'}</Kbd>
                                            <span className="text-sm text-muted-foreground">→ Text input</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Kbd className="w-fit whitespace-nowrap">{'{{select:Name:Option1|Option2}}'}</Kbd>
                                            <span className="text-sm text-muted-foreground">→ Dropdown</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Kbd className="w-fit whitespace-nowrap">{'{{slider:Name:50}}'}</Kbd>
                                            <span className="text-sm text-muted-foreground">→ Slider</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Kbd className="w-fit whitespace-nowrap break-all">{'{{toggle:Name}}...{{/toggle:Name}}'}</Kbd>
                                            <span className="text-sm text-muted-foreground">→ Toggle block</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        💡 Tip: Type <Kbd className="whitespace-nowrap">Ctrl+{'{'}</Kbd> to quickly start a control placeholder
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">⌨️ Shortcuts</h4>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Kbd>Ctrl+N</Kbd>
                                            <span className="text-sm">Add element</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Kbd>Ctrl+S</Kbd>
                                            <span className="text-sm">Save</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Kbd>Ctrl+C</Kbd>
                                            <span className="text-sm">Copy prompt</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Kbd>Escape</Kbd>
                                            <span className="text-sm">Back to browser</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">🔄 Preview Modes</h4>
                                    <div className="space-y-1">
                                        <div><strong>Clean:</strong> Final prompt with values</div>
                                        <div><strong>Raw:</strong> Prompt with {'{{...}}'} syntax</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Export Options Modal */}
            <ExportOptionsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExportPrompt}
                exportType="prompt"
                project={currentProject}
                prompt={currentPrompt}
                versions={versions}
            />

            {/* Delete Structural Element Confirmation Dialog */}
            <AlertDialog open={deleteElementId !== null} onOpenChange={(open) => !open && setDeleteElementId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Structural Element</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{structure.find(el => el.id === deleteElementId)?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeleteElement}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}