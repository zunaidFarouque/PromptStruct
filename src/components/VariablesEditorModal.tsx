import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { Plus, Trash2, Edit2, Save, X, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VariablesEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VariablesEditorModal({ isOpen, onClose }: VariablesEditorModalProps) {
    const { getAllVariables, setVariable, deleteVariable } = useEditorStore();
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [editingVar, setEditingVar] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newVarName, setNewVarName] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [deleteVarName, setDeleteVarName] = useState<string | null>(null);

    // Load variables when modal opens
    useEffect(() => {
        if (isOpen) {
            setVariables(getAllVariables());
            setEditingVar(null);
            setEditValue('');
            setNewVarName('');
            setNewVarValue('');
            setSearchTerm('');
        }
    }, [isOpen, getAllVariables]);

    // Update local state when store changes
    useEffect(() => {
        setVariables(getAllVariables());
    }, [getAllVariables]);

    const variableNames = Object.keys(variables).sort();
    const filteredVariables = variableNames.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (varName: string) => {
        setEditingVar(varName);
        setEditValue(variables[varName] || '');
    };

    const handleSaveEdit = () => {
        if (editingVar) {
            setVariable(editingVar, editValue);
            setEditingVar(null);
            setEditValue('');
        }
    };

    const handleCancelEdit = () => {
        setEditingVar(null);
        setEditValue('');
    };

    const handleCreateVariable = () => {
        if (!newVarName.trim()) return;
        
        // Validate variable name (must start with #)
        const varName = newVarName.trim().startsWith('#') 
            ? newVarName.trim() 
            : `#${newVarName.trim()}`;
        
        // Validate: alphanumeric, underscores, and # only
        if (!/^#[a-zA-Z0-9_]+$/.test(varName)) {
            alert('Variable name must start with # and contain only letters, numbers, and underscores');
            return;
        }

        // Check if variable already exists
        if (variables[varName]) {
            alert('Variable already exists');
            return;
        }

        setVariable(varName, newVarValue);
        setNewVarName('');
        setNewVarValue('');
    };

    const handleDeleteClick = (varName: string) => {
        setDeleteVarName(varName);
    };

    const handleConfirmDelete = () => {
        if (deleteVarName) {
            deleteVariable(deleteVarName);
            setDeleteVarName(null);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Variables Editor</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col space-y-4">
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

                        {/* Variables Table */}
                        <ScrollArea className="flex-1 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Variable Name</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVariables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                                {searchTerm ? 'No variables found' : 'No variables yet. Create one below.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredVariables.map((varName) => (
                                            <TableRow key={varName}>
                                                <TableCell className="font-mono font-semibold">
                                                    {varName}
                                                </TableCell>
                                                <TableCell>
                                                    {editingVar === varName ? (
                                                        <Textarea
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="min-h-[60px] font-mono text-sm"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                                                            {variables[varName] || '(empty)'}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingVar === varName ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={handleSaveEdit}
                                                                title="Save"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={handleCancelEdit}
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleEdit(varName)}
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteClick(varName)}
                                                                title="Delete"
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>

                        {/* Create New Variable */}
                        <div className="border-t pt-4 space-y-2">
                            <Label className="text-sm font-semibold">Create New Variable</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="#variable_name"
                                    value={newVarName}
                                    onChange={(e) => setNewVarName(e.target.value)}
                                    className="font-mono text-sm"
                                />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Initial value..."
                                        value={newVarValue}
                                        onChange={(e) => setNewVarValue(e.target.value)}
                                        className="text-sm flex-1"
                                    />
                                    <Button
                                        onClick={handleCreateVariable}
                                        size="sm"
                                        disabled={!newVarName.trim()}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteVarName !== null} onOpenChange={(open) => !open && setDeleteVarName(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Variable</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the variable <code className="font-mono font-semibold">{deleteVarName}</code>?
                            This will unlink it from any elements that are using it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

