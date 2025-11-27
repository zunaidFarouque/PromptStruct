import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ControlPanel } from './ControlPanel';
import { EnhancedTextarea, EnhancedTextareaRef } from './EnhancedTextarea';
import { StructuralElement } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, Edit2, Star, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuItem
} from '@/components/ui/dropdown-menu';

interface StructuralElementCardProps {
    element: StructuralElement;
    onUpdate: (id: string, updates: Partial<StructuralElement>) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    controlValues: Record<string, any>;
    onControlChange: (name: string, value: any) => void;
    collapsed: { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } };
    onCollapsedChange: (collapsed: { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } }) => void;
    highlighted?: boolean;
    starredControls: Record<string, string[]>;
    starredTextBoxes: string[];
    onToggleStarControl: (elementId: string, controlName: string) => void;
    onToggleStarTextBox: (elementId: string) => void;
}

export interface StructuralElementCardRef {
    focusTextarea: () => void;
    setTextareaSelectionRange: (start: number, end: number) => void;
}

export const StructuralElementCard = forwardRef<StructuralElementCardRef, StructuralElementCardProps>(({
    element,
    onUpdate,
    onDelete,
    onToggle,
    controlValues,
    onControlChange,
    collapsed,
    onCollapsedChange,
    highlighted = false,
    starredControls,
    starredTextBoxes,
    onToggleStarControl,
    onToggleStarTextBox
}, ref) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState(element.name);
    const textareaRef = useRef<EnhancedTextareaRef>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
        focusTextarea: () => textareaRef.current?.focus(),
        setTextareaSelectionRange: (start: number, end: number) => {
            textareaRef.current?.setSelectionRange(start, end);
        },
    }));

    const isTextExpanded = !collapsed.text;
    const isControlsExpanded = !collapsed.controls;

    const handleTextToggle = () => {
        onCollapsedChange({ ...collapsed, text: !collapsed.text });
    };

    const handleControlsToggle = () => {
        onCollapsedChange({ ...collapsed, controls: !collapsed.controls });
    };

    const handleNameClick = () => {
        const isCurrentlyExpanded = isTextExpanded || isControlsExpanded;

        if (isCurrentlyExpanded) {
            // Currently expanded - collapse to neither visible
            onCollapsedChange({
                text: true,
                controls: true,
                lastExpandedState: { text: isTextExpanded, controls: isControlsExpanded }
            });
        } else {
            // Currently collapsed - restore to last expanded state or default to both
            const lastState = collapsed.lastExpandedState || { text: true, controls: true };
            onCollapsedChange({
                text: !lastState.text,
                controls: !lastState.controls,
                lastExpandedState: lastState
            });
        }
    };

    const handleRenameClick = () => {
        setIsEditingName(true);
        setEditingName(element.name);
    };

    const handleRenameSave = () => {
        if (editingName.trim()) {
            onUpdate(element.id, { name: editingName.trim() });
        }
        setIsEditingName(false);
    };

    const handleRenameCancel = () => {
        setEditingName(element.name);
        setIsEditingName(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSave();
        } else if (e.key === 'Escape') {
            handleRenameCancel();
        }
    };

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: element.id });

    const style = {
        // Use translate-only to avoid scale being applied during drag which can stretch items
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
        willChange: 'transform',
    } as React.CSSProperties;


    return (
        <div ref={setNodeRef} style={style} className="" data-element-card-id={element.id}>
            <Card className={`transition-all duration-200 ${!element.enabled ? 'opacity-50' : ''} ${highlighted ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''} dark:bg-neutral-800`}>
                <CardHeader className="card-header-sizing" style={{ minHeight: 'var(--card-header-height)' }}>
                    <div className="card-toolbar">
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab p-1 hover:bg-accent rounded"
                        >
                            <GripVertical className="w-4 h-4" />
                        </div>
                        {isEditingName ? (
                            <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleRenameSave}
                                onKeyDown={handleRenameKeyDown}
                                placeholder="Element name..."
                                className="flex-1 font-semibold"
                                autoFocus
                            />
                        ) : (
                            <span
                                className="flex-1 font-semibold cursor-pointer px-3 py-2 hover:bg-accent rounded"
                                onClick={handleNameClick}
                            >
                                {element.name}
                            </span>
                        )}
                        {!isEditingName && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRenameClick}
                                className="text-muted-foreground hover:text-foreground"
                                title="Rename element"
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleTextToggle}
                            className="text-muted-foreground hover:text-foreground"
                            title={isTextExpanded ? "Hide text area" : "Show text area"}
                        >
                            {isTextExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleControlsToggle}
                            className="text-muted-foreground hover:text-foreground"
                            title={isControlsExpanded ? "Hide dynamic controls" : "Show dynamic controls"}
                        >
                            {isControlsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={element.enabled}
                                onCheckedChange={() => onToggle(element.id)}
                                aria-label={element.enabled ? 'On' : 'Off'}
                                id={`toggle-${element.id}`}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Element options"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuCheckboxItem
                                    checked={element.autoRemoveEmptyLines ?? true}
                                    onCheckedChange={(checked) =>
                                        onUpdate(element.id, { autoRemoveEmptyLines: !!checked })
                                    }
                                >
                                    Auto-remove empty lines
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => onDelete(element.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete element
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                {(isTextExpanded || isControlsExpanded) && (
                    <CardContent className="card-padding struct-card-content dark:bg-neutral-900">
                        <Collapsible open={isTextExpanded} onOpenChange={(open) => onCollapsedChange({ ...collapsed, text: !open })}>
                            <CollapsibleContent className="collapsible-content">
                                <div className="relative group">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onToggleStarTextBox(element.id)}
                                        className={`absolute top-2 right-2 w-4 h-4 p-0 z-10 transition-opacity duration-200 ${Array.isArray(starredTextBoxes) && starredTextBoxes.includes(element.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                            }`}
                                        title={Array.isArray(starredTextBoxes) && starredTextBoxes.includes(element.id) ? 'Remove from starred' : 'Add to starred'}
                                    >
                                        <Star className={`w-4 h-4 ${Array.isArray(starredTextBoxes) && starredTextBoxes.includes(element.id) ? 'fill-current text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`} />
                                    </Button>
                                    <EnhancedTextarea
                                        ref={textareaRef}
                                        value={element.content}
                                        onChange={(e) => onUpdate(element.id, { content: e.target.value })}
                                        placeholder="Enter your prompt content here..."
                                        className="min-h-[80px] font-mono text-sm resize-y dark:bg-neutral-900"
                                        elementId={element.id}
                                    />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Collapsible open={isControlsExpanded} onOpenChange={(open) => onCollapsedChange({ ...collapsed, controls: !open })}>
                            <CollapsibleContent className="collapsible-content">
                                {(isTextExpanded && isControlsExpanded) && (
                                    <h4 className="text-sm font-medium title-spacing section-vpad">Dynamic Controls</h4>
                                )}
                                <ControlPanel
                                    content={element.content}
                                    controlValues={controlValues}
                                    onControlChange={onControlChange}
                                    elementId={element.id}
                                    starredControls={starredControls}
                                    onToggleStarControl={onToggleStarControl}
                                />
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                )}
            </Card>
        </div>
    );
});

StructuralElementCard.displayName = 'StructuralElementCard';
