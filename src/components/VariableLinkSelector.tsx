import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link, Link2Off, Plus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VariableLinkSelectorProps {
    elementId: string;
    currentVariable?: string;
    onSelect: (variableName: string | null) => void;
}

export function VariableLinkSelector({ currentVariable, onSelect }: VariableLinkSelectorProps) {
    const { getAllVariables, setVariable } = useEditorStore();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newVariableName, setNewVariableName] = useState('');
    const [newVariableValue, setNewVariableValue] = useState('');

    const allVariables = getAllVariables();
    const variableNames = Object.keys(allVariables).sort();

    // Filter variables based on search term
    const filteredVariables = variableNames.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLink = (variableName: string) => {
        onSelect(variableName);
        setOpen(false);
    };

    const handleUnlink = () => {
        onSelect(null);
        setOpen(false);
    };

    const handleCreateVariable = () => {
        if (!newVariableName.trim()) return;
        
        // Validate variable name (must start with #)
        const varName = newVariableName.trim().startsWith('#') 
            ? newVariableName.trim() 
            : `#${newVariableName.trim()}`;
        
        // Validate: alphanumeric, underscores, and # only
        if (!/^#[a-zA-Z0-9_]+$/.test(varName)) {
            alert('Variable name must start with # and contain only letters, numbers, and underscores');
            return;
        }

        setVariable(varName, newVariableValue);
        onSelect(varName);
        setNewVariableName('');
        setNewVariableValue('');
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${currentVariable ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
                    title={currentVariable ? `Linked to ${currentVariable}` : 'Link to variable'}
                >
                    {currentVariable ? (
                        <Link className="w-4 h-4" />
                    ) : (
                        <Link className="w-4 h-4" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Link to Variable</h4>
                        {currentVariable && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleUnlink}
                                className="h-7 text-xs text-destructive"
                            >
                                <Link2Off className="w-3 h-3 mr-1" />
                                Unlink
                            </Button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search variables..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    {/* Existing Variables List */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Existing Variables</Label>
                        <ScrollArea className="h-48">
                            {filteredVariables.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    {searchTerm ? 'No variables found' : 'No variables yet'}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredVariables.map((varName) => (
                                        <Button
                                            key={varName}
                                            variant={currentVariable === varName ? 'secondary' : 'ghost'}
                                            className="w-full justify-start text-left h-auto py-2 px-3"
                                            onClick={() => handleLink(varName)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-mono text-sm font-semibold truncate">
                                                    {varName}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {allVariables[varName] || '(empty)'}
                                                </div>
                                            </div>
                                            {currentVariable === varName && (
                                                <Link className="w-4 h-4 ml-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Create New Variable */}
                    <div className="space-y-2 border-t pt-4">
                        <Label className="text-xs text-muted-foreground">Create New Variable</Label>
                        <div className="space-y-2">
                            <Input
                                placeholder="#variable_name"
                                value={newVariableName}
                                onChange={(e) => setNewVariableName(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <Input
                                placeholder="Initial value..."
                                value={newVariableValue}
                                onChange={(e) => setNewVariableValue(e.target.value)}
                                className="text-sm"
                            />
                            <Button
                                onClick={handleCreateVariable}
                                size="sm"
                                className="w-full"
                                disabled={!newVariableName.trim()}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create & Link
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

