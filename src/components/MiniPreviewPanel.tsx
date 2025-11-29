import { useEditorStore } from '@/stores/editorStore';
import { getProcessedElementContent } from '@/utils/elementOutput';
import { MiniStructureEditor } from './MiniStructureEditor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Copy, Columns, Rows, EyeOff } from 'lucide-react';
import { NotificationService } from '@/services/notificationService';

export function DirectUsePanel() {
    const { structure, uiGlobalControlValues, browserPanels, setBrowserPanels, variables } = useEditorStore();

    // Subscribe to variables to ensure re-render when variables change
    // This is needed so the preview updates when linked elements are edited
    // Reference variables to create subscription (even if not directly used in computation)
    void variables;

    const renderedChunks = structure
        .map(element => getProcessedElementContent(element, 'clean', uiGlobalControlValues))
        .filter(content => content.length > 0);
    const rendered = renderedChunks.join('\n\n');

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(rendered).then(() => {
            NotificationService.success('Prompt copied to clipboard!');
        }).catch(() => {
            NotificationService.error('Failed to copy prompt');
        });
    };

    const toggleLayoutDirection = () => {
        const current = browserPanels.miniEditorLayoutDirection || 'vertical';
        let next: 'horizontal' | 'vertical' | 'hidden';

        if (current === 'vertical') {
            next = 'horizontal';
        } else if (current === 'horizontal') {
            next = 'hidden';
        } else {
            next = 'vertical';
        }

        setBrowserPanels({
            miniEditorLayoutDirection: next
        });
    };

    const layoutDirection = browserPanels.miniEditorLayoutDirection || 'vertical';
    const isHidden = layoutDirection === 'hidden';

    const getLayoutButtonIcon = () => {
        if (layoutDirection === 'vertical') {
            return <Columns className="w-3 h-3" />;
        } else if (layoutDirection === 'horizontal') {
            return <Rows className="w-3 h-3" />;
        } else {
            return <EyeOff className="w-3 h-3" />;
        }
    };

    const getLayoutButtonTitle = () => {
        if (layoutDirection === 'vertical') {
            return 'Switch to horizontal layout';
        } else if (layoutDirection === 'horizontal') {
            return 'Hide output prompt';
        } else {
            return 'Show output prompt (vertical layout)';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {isHidden ? (
                // Hidden layout - only show mini structure editor
                <div className="h-full panel-padding flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Mini Structure Editor</div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleLayoutDirection}
                            className="h-6 w-6 p-0"
                            title={getLayoutButtonTitle()}
                        >
                            {getLayoutButtonIcon()}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <MiniStructureEditor />
                    </div>
                    <div className="flex-shrink-0 mt-2">
                        <Button
                            onClick={handleCopyPrompt}
                            disabled={rendered.length === 0}
                            className="w-full"
                            size="sm"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Prompt
                        </Button>
                    </div>
                </div>
            ) : (
                // Visible layout - show resizable panels
                <ResizablePanelGroup
                    direction={layoutDirection}
                    autoSaveId={layoutDirection === 'vertical' ? 'direct-use-layout-vertical' : 'direct-use-layout-horizontal'}
                >
                    {/* Mini Structure Editor */}
                    <ResizablePanel defaultSize={layoutDirection === 'vertical' ? 40 : 50} minSize={20}>
                        <div className="h-full panel-padding flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm text-muted-foreground">Mini Structure Editor</div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleLayoutDirection}
                                    className="h-6 w-6 p-0"
                                    title={getLayoutButtonTitle()}
                                >
                                    {getLayoutButtonIcon()}
                                </Button>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <MiniStructureEditor />
                            </div>
                            <div className="flex-shrink-0 mt-2">
                                <Button
                                    onClick={handleCopyPrompt}
                                    disabled={rendered.length === 0}
                                    className="w-full"
                                    size="sm"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Prompt
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Output Prompt */}
                    <ResizablePanel defaultSize={layoutDirection === 'vertical' ? 60 : 50} minSize={30}>
                        <div className="h-full panel-padding flex flex-col">
                            <div className="text-sm text-muted-foreground mb-2 text-center">Output Prompt</div>
                            <div className="flex-1 overflow-auto whitespace-pre-wrap font-mono text-sm">
                                {rendered.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-4">✨</div>
                                        <p>Your rendered prompt will appear here...</p>
                                        <small className="text-muted-foreground">Add some elements to get started</small>
                                    </div>
                                ) : (
                                    <div>{rendered}</div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}
        </div>
    );
}


