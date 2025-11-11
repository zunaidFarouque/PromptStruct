import { useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { NotificationService } from '@/services/notificationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Settings, Save, Trash2 } from 'lucide-react';

interface ProjectSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteRequest?: () => void;
}

export function ProjectSettings({ isOpen, onClose, onDeleteRequest }: ProjectSettingsProps) {
    const { currentProject, updateProject } = useEditorStore();
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [projectTags, setProjectTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [defaultPromptTemplate, setDefaultPromptTemplate] = useState('');
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [autoSaveInterval, setAutoSaveInterval] = useState(30);
    const [exportFormat, setExportFormat] = useState<'json' | 'markdown' | 'txt'>('json');

    useEffect(() => {
        if (currentProject) {
            setProjectName(currentProject.name);
            setProjectDescription(currentProject.description || '');
            setProjectTags(currentProject.tags || []);
            setDefaultPromptTemplate(currentProject.defaultPromptTemplate || '');
            setAutoSaveEnabled(currentProject.settings?.autoSaveEnabled ?? true);
            setAutoSaveInterval(currentProject.settings?.autoSaveInterval ?? 30);
            setExportFormat(currentProject.settings?.exportFormat ?? 'json');
        }
    }, [currentProject]);

    const handleSave = () => {
        if (!currentProject) return;

        try {
            updateProject(currentProject.id, {
                name: projectName,
                description: projectDescription,
                tags: projectTags,
                defaultPromptTemplate,
                settings: {
                    autoSaveEnabled,
                    autoSaveInterval,
                    exportFormat,
                },
            });

            NotificationService.success('Project settings saved!');
            onClose();
        } catch (error) {
            NotificationService.error(`Failed to save settings: ${error}`);
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !projectTags.includes(newTag.trim())) {
            setProjectTags([...projectTags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setProjectTags(projectTags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };

    if (!isOpen || !currentProject) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Project Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="stack-section vpad-3">
                    {/* Basic Information */}
                    <div className="stack-section">
                        <h4 className="text-lg font-semibold">Basic Information</h4>

                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Enter project name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="project-description">Description</Label>
                            <Textarea
                                id="project-description"
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                                placeholder="Describe what this project is about..."
                                rows={3}
                                className="resize-y"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Add a tag"
                                    className="flex-1"
                                />
                                <Button onClick={handleAddTag} size="sm">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {projectTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                        {tag}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="h-auto p-0 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Default Template */}
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold">Default Prompt Template</h4>
                        <div className="space-y-2">
                            <Label htmlFor="default-template">Template Content</Label>
                            <Textarea
                                id="default-template"
                                value={defaultPromptTemplate}
                                onChange={(e) => setDefaultPromptTemplate(e.target.value)}
                                placeholder="Enter default template for new prompts..."
                                rows={4}
                                className="resize-y"
                            />
                            <p className="text-xs text-muted-foreground">
                                This template will be used when creating new prompts in this project.
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Settings */}
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold">Project Settings</h4>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Auto-save</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically save changes to prompts
                                    </p>
                                </div>
                                <Switch
                                    checked={autoSaveEnabled}
                                    onCheckedChange={setAutoSaveEnabled}
                                />
                            </div>

                            {autoSaveEnabled && (
                                <div className="space-y-2">
                                    <Label htmlFor="auto-save-interval">Auto-save Interval (seconds)</Label>
                                    <Input
                                        id="auto-save-interval"
                                        type="number"
                                        min="10"
                                        max="300"
                                        value={autoSaveInterval}
                                        onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="export-format">Default Export Format</Label>
                            <Select
                                value={exportFormat}
                                onValueChange={(value) => setExportFormat(value as 'json' | 'markdown' | 'txt')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="markdown">Markdown</SelectItem>
                                    <SelectItem value="txt">Plain Text</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    {/* Delete Project Section */}
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-destructive">Danger Zone</h4>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Deleting this project will permanently remove it and all its prompts. This action cannot be undone.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (onDeleteRequest) {
                                        onDeleteRequest();
                                        onClose();
                                    }
                                }}
                                className="w-full"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Project
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
