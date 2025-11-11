import { useEditorStore } from '@/stores/editorStore';
import { Project, Prompt } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationService } from '@/services/notificationService';
import { useKeyboardShortcuts, CommonShortcuts } from '@/services/keyboardShortcuts';
import { ProjectSettings } from './ProjectSettings';
import { AdvancedSearch } from './AdvancedSearch';
import { ProjectTemplates } from './ProjectTemplates';
import { ImportPreviewModal } from './ImportPreviewModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EnhancedSearchBar } from './EnhancedSearchBar';
import { analyzeImportData, applyImportResolutions } from '@/utils/importAnalyzer';
import { ImportAnalysis, ImportConflict } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TopBar } from './TopBar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DirectUsePanel } from './MiniPreviewPanel';
import { Search, Plus, Upload, FileText, Settings, Download, X, Edit, Copy, FolderOpen, Calendar, Tag, Star, ExternalLink, MoreVertical } from 'lucide-react';

export function ProjectBrowser() {
    const {
        projects,
        prompts,
        addProject,
        addPrompt,
        updateProject,
        updatePrompt,
        deleteProject,
        deletePrompt,
        setCurrentProject,
        setCurrentPrompt,
        setPreviewMode,
        setUiHelpPanelExpanded,
        setUiPanelLayout,
        setUiCollapsedByElementId,
        setUiGlobalControlValues,
        uiShowFavourites,
        versions,
        browserPanels,
        setBrowserPanels,
        setMiniEditorContext
    } = useEditorStore();

    const navigate = useNavigate();
    const panelGroupRef = useRef<any>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectTags, setNewProjectTags] = useState('');
    const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
    const [editingPromptName, setEditingPromptName] = useState('');
    const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
    const [bulkProjectMode, setBulkProjectMode] = useState(false);
    const [showProjectSettings, setShowProjectSettings] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<{ projects: Project[]; prompts: Prompt[] } | null>(null);
    const [showProjectTemplates, setShowProjectTemplates] = useState(false);
    const [compactActions, setCompactActions] = useState(false);
    const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
    const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
    const [compactProjectsActions, setCompactProjectsActions] = useState(false);
    const [compactPromptCards, setCompactPromptCards] = useState(false);
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
    const [rawImportData, setRawImportData] = useState<any>(null);

    // Restore selection on mount
    useEffect(() => {
        const { currentProject } = useEditorStore.getState();
        if (currentProject) {
            setSelectedProject(currentProject);
        }
    }, []);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            ...CommonShortcuts.NEW_PROJECT,
            action: () => setShowNewProjectForm(true)
        },
        {
            ...CommonShortcuts.NEW_PROMPT,
            action: () => {
                if (selectedProject) {
                    handleCreatePrompt(selectedProject.id);
                }
            }
        },
        {
            ...CommonShortcuts.BULK_MODE,
            action: () => {
                if (selectedProject && projectPrompts.length > 0) {
                    setBulkMode(!bulkMode);
                    setSelectedPrompts(new Set());
                }
            }
        },
        {
            ...CommonShortcuts.SEARCH,
            action: () => {
                const searchInput = document.querySelector('input[placeholder="Search projects..."]') as HTMLInputElement;
                searchInput?.focus();
            }
        },
        {
            ...CommonShortcuts.ESCAPE,
            action: () => {
                if (bulkMode) {
                    setBulkMode(false);
                    setSelectedPrompts(new Set());
                }
                if (showNewProjectForm) {
                    setShowNewProjectForm(false);
                }
                if (editingPrompt) {
                    setEditingPrompt(null);
                    setEditingPromptName('');
                }
            }
        }
    ]);

    const filteredProjects = searchResults?.projects || projects;
    const filteredPrompts = searchResults?.prompts || [];

    // Create virtual Favourites project
    const favouritesProject: Project = {
        id: 'virtual_favourites',
        name: '⭐ Favourites',
        description: 'Your favorite prompts from all projects',
        prompts: prompts.filter(p => p.tags.includes('Favourite')).map(p => p.id),
        tags: ['Favourites'],
        defaultPromptTemplate: '',
        settings: {
            autoSaveEnabled: true,
            autoSaveInterval: 30,
            exportFormat: 'json'
        },
        createdAt: new Date().toISOString()
    };

    // Add Favourites project to the list if enabled and has favourites
    const projectsWithFavourites = uiShowFavourites && favouritesProject.prompts.length > 0
        ? [favouritesProject, ...filteredProjects]
        : filteredProjects;

    const projectPrompts = selectedProject
        ? prompts.filter(prompt => selectedProject.prompts.includes(prompt.id))
        : [];

    const handleCreateProject = () => {
        if (!newProjectName.trim()) return;

        const project: Project = {
            id: `proj_${Date.now()}`,
            name: newProjectName.trim(),
            description: '',
            prompts: [],
            tags: newProjectTags.split(',').map(tag => tag.trim()).filter(Boolean),
            defaultPromptTemplate: '',
            settings: {
                autoSaveEnabled: true,
                autoSaveInterval: 30,
                exportFormat: 'json'
            },
            createdAt: new Date().toISOString()
        };

        addProject(project);
        NotificationService.projectCreated(project.name);
        setNewProjectName('');
        setNewProjectTags('');
        setShowNewProjectForm(false);
    };

    const handleCreatePrompt = (projectId: string) => {
        const prompt: Prompt = {
            id: `prompt_${Date.now()}`,
            name: 'New Prompt',
            versions: [],
            currentVersion: '',
            tags: [],
            createdAt: new Date().toISOString()
        };

        addPrompt(prompt);
        NotificationService.promptCreated(prompt.name);

        // Add prompt to project
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const updatedProject = {
                ...project,
                prompts: [...project.prompts, prompt.id]
            };
            updateProject(projectId, updatedProject);

            // Update selectedProject state to reflect the new prompt
            if (selectedProject?.id === projectId) {
                setSelectedProject(updatedProject);
            }
        }
    };

    const handleConfirmDeleteProject = () => {
        if (deleteProjectId) {
            deleteProject(deleteProjectId);
            if (selectedProject?.id === deleteProjectId) {
                setSelectedProject(null);
            }
            setDeleteProjectId(null);
            NotificationService.success('Project deleted successfully');
        }
    };

    const handleConfirmDeletePrompt = () => {
        if (deletePromptId) {
            deletePrompt(deletePromptId);

            // Update selectedProject to remove the deleted prompt
            if (selectedProject) {
                const updatedProject = {
                    ...selectedProject,
                    prompts: selectedProject.prompts.filter(id => id !== deletePromptId)
                };
                setSelectedProject(updatedProject);
            }
            setDeletePromptId(null);
            NotificationService.success('Prompt deleted successfully');
        }
    };

    const handleRenamePrompt = (promptId: string, newName: string) => {
        if (!newName.trim()) return;

        updatePrompt(promptId, { name: newName.trim() });
        NotificationService.success(`Prompt renamed to "${newName.trim()}"`);
        setEditingPrompt(null);
        setEditingPromptName('');
    };

    const handleToggleFavourite = (promptId: string) => {
        const prompt = prompts.find(p => p.id === promptId);
        if (!prompt) return;

        const isFavourite = prompt.tags.includes('Favourite');
        const newTags = isFavourite
            ? prompt.tags.filter(tag => tag !== 'Favourite')
            : [...prompt.tags, 'Favourite'];

        updatePrompt(promptId, { tags: newTags });
        NotificationService.success(isFavourite ? 'Removed from favourites' : 'Added to favourites');
    };

    const handleDuplicatePrompt = (prompt: Prompt) => {
        const duplicatedPrompt: Prompt = {
            id: `prompt_${Date.now()}`,
            name: `${prompt.name} (Copy)`,
            versions: [...prompt.versions],
            currentVersion: prompt.currentVersion,
            tags: [...prompt.tags],
            createdAt: new Date().toISOString()
        };

        addPrompt(duplicatedPrompt);
        NotificationService.promptCreated(duplicatedPrompt.name);

        // Add duplicated prompt to the same project
        if (selectedProject) {
            const updatedProject = {
                ...selectedProject,
                prompts: [...selectedProject.prompts, duplicatedPrompt.id]
            };
            updateProject(selectedProject.id, updatedProject);
            setSelectedProject(updatedProject);
        }
    };

    const startEditingPrompt = (prompt: Prompt) => {
        setEditingPrompt(prompt.id);
        setEditingPromptName(prompt.name);
    };

    const handleBulkSelect = (promptId: string) => {
        const newSelected = new Set(selectedPrompts);
        if (newSelected.has(promptId)) {
            newSelected.delete(promptId);
        } else {
            newSelected.add(promptId);
        }
        setSelectedPrompts(newSelected);
    };

    const handleBulkDelete = () => {
        if (selectedPrompts.size === 0) return;

        selectedPrompts.forEach(promptId => {
            deletePrompt(promptId);
        });

        if (selectedProject) {
            const updatedProject = {
                ...selectedProject,
                prompts: selectedProject.prompts.filter(id => !selectedPrompts.has(id))
            };
            setSelectedProject(updatedProject);
        }

        NotificationService.success(`${selectedPrompts.size} prompts deleted successfully!`);
        setSelectedPrompts(new Set());
        setBulkMode(false);
    };

    const handleBulkExport = () => {
        if (selectedPrompts.size === 0) return;

        const selectedPromptData = prompts.filter(p => selectedPrompts.has(p.id));
        const selectedPromptIds = selectedPromptData.map(p => p.id);
        // Filter out autosaves from version export
        const selectedVersions = versions.filter(v => selectedPromptIds.includes(v.promptId) && !v.isAutoSave);

        // Check if any prompts have no versions
        const promptsWithoutVersions = selectedPromptData.filter(p => {
            return !selectedVersions.some(v => v.promptId === p.id);
        });

        if (promptsWithoutVersions.length > 0) {
            NotificationService.error(`Cannot export prompts without saved content. Please save these prompts first: ${promptsWithoutVersions.map(p => p.name).join(', ')}`);
            return;
        }

        // Get UI states for selected prompts
        const storeState = useEditorStore.getState();
        const promptUIStates: Record<string, any> = {};
        selectedPromptIds.forEach(promptId => {
            if (storeState.promptUIStates[promptId]) {
                promptUIStates[promptId] = storeState.promptUIStates[promptId];
            }
        });

        const exportData = {
            prompts: selectedPromptData,
            versions: selectedVersions,
            promptUIStates: Object.keys(promptUIStates).length > 0 ? promptUIStates : undefined,
            exportedAt: new Date().toISOString(),
            count: selectedPromptData.length
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk_prompts_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        NotificationService.success(`${selectedPrompts.size} prompts exported successfully!`);
    };

    const handleBulkSelectProject = (projectId: string) => {
        const newSelected = new Set(selectedProjects);
        if (newSelected.has(projectId)) {
            newSelected.delete(projectId);
        } else {
            newSelected.add(projectId);
        }
        setSelectedProjects(newSelected);
    };

    const handleBulkExportProjects = () => {
        if (selectedProjects.size === 0) return;

        const selectedProjectData = projects.filter(p => selectedProjects.has(p.id));
        const selectedPromptIds = selectedProjectData.flatMap(p => p.prompts);
        const selectedPromptsData = prompts.filter(p => selectedPromptIds.includes(p.id));
        // Filter out autosaves from version export
        const selectedVersions = versions.filter(v => selectedPromptIds.includes(v.promptId) && !v.isAutoSave);

        // Check for prompts without versions
        const promptsWithoutVersions = selectedPromptsData.filter(p => {
            return !selectedVersions.some(v => v.promptId === p.id);
        });

        if (promptsWithoutVersions.length > 0) {
            NotificationService.error(`Cannot export projects with prompts that have no saved content: ${promptsWithoutVersions.map(p => p.name).join(', ')}`);
            return;
        }

        // Get UI states for selected prompts
        const storeState = useEditorStore.getState();
        const promptUIStates: Record<string, any> = {};
        selectedPromptIds.forEach(promptId => {
            if (storeState.promptUIStates[promptId]) {
                promptUIStates[promptId] = storeState.promptUIStates[promptId];
            }
        });

        const exportData = {
            projects: selectedProjectData,
            prompts: selectedPromptsData,
            versions: selectedVersions,
            promptUIStates: Object.keys(promptUIStates).length > 0 ? promptUIStates : undefined,
            exportedAt: new Date().toISOString(),
            count: selectedProjectData.length
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk_projects_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        NotificationService.success(`${selectedProjects.size} projects exported successfully!`);
    };

    const clearSearchResults = () => {
        setSearchResults(null);
    };

    const handleCreateFromTemplate = (template: any) => {
        // Create project from template
        const project: Project = {
            id: `proj_${Date.now()}`,
            name: template.projectData.name,
            description: template.projectData.description,
            prompts: [],
            tags: template.projectData.tags,
            defaultPromptTemplate: template.projectData.defaultPromptTemplate,
            settings: template.projectData.settings,
            createdAt: new Date().toISOString()
        };

        addProject(project);
        NotificationService.projectCreated(project.name);
        setShowProjectTemplates(false);
    };

    const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                
                // Analyze import data and detect conflicts
                const analysis = analyzeImportData(data, projects, prompts, versions);
                
                // Store the raw data and show preview modal
                setRawImportData(data);
                setImportAnalysis(analysis);
                setShowImportPreview(true);
            } catch (error) {
                NotificationService.error(`Import failed: ${error}`);
            }
        };
        reader.readAsText(file);

        // Reset file input to allow importing the same file again
        event.target.value = '';
    };

    const handleImportConfirm = (resolutions: ImportConflict[]) => {
        if (!importAnalysis || !rawImportData) return;

        try {
            // Apply conflict resolutions
            const resolved = applyImportResolutions(importAnalysis, resolutions);
            
            // Get current state from store
            const state = useEditorStore.getState();
            const currentProjects = state.projects;
            const currentPrompts = state.prompts;
            const currentVersions = state.versions;
            
            // Import resolved data
            resolved.projects.forEach(project => {
                const existingIndex = currentProjects.findIndex(p => p.id === project.id);
                if (existingIndex >= 0) {
                    // Update existing
                    state.updateProject(project.id, project);
                } else {
                    // Add new
                    addProject(project);
                }
            });

            // Import versions first to ensure they exist when prompts reference them
            resolved.versions.forEach(version => {
                const existingIndex = currentVersions.findIndex(v => v.id === version.id);
                if (existingIndex >= 0) {
                    // Update existing
                    state.updateVersion(version.id, version);
                } else {
                    // Add new
                    state.addVersion(version);
                }
            });

            // Import prompts with their updated metadata (versions array and currentVersion)
            // The metadata is already set correctly by applyImportResolutions
            resolved.prompts.forEach(prompt => {
                const existingIndex = currentPrompts.findIndex(p => p.id === prompt.id);
                if (existingIndex >= 0) {
                    // Update existing prompt with all metadata including versions and currentVersion
                    state.updatePrompt(prompt.id, prompt);
                } else {
                    // Add new prompt with metadata
                    addPrompt(prompt);
                }
            });

            // Import UI states for prompts if available
            // Handle bulk export format (promptUIStates object)
            if (rawImportData.promptUIStates && typeof rawImportData.promptUIStates === 'object') {
                Object.entries(rawImportData.promptUIStates).forEach(([promptId, uiState]: [string, any]) => {
                    // Only import UI state if the prompt exists (either was just imported or already existed)
                    const promptExists = resolved.prompts.some(p => p.id === promptId) || 
                                       currentPrompts.some(p => p.id === promptId);
                    if (promptExists && uiState) {
                        state.setPromptUIState(promptId, uiState);
                    }
                });
            }
            
            // Handle single prompt export format (uiState at root level)
            if (rawImportData.uiState && rawImportData.prompt) {
                const promptId = rawImportData.prompt.id;
                const promptExists = resolved.prompts.some(p => p.id === promptId) || 
                                   currentPrompts.some(p => p.id === promptId);
                if (promptExists && rawImportData.uiState) {
                    // Map single prompt UI state format to promptUIStates format
                    const uiState = rawImportData.uiState;
                    const promptUIState = {
                        starredControls: uiState.starredControls || {},
                        starredTextBoxes: uiState.starredTextBoxes || [],
                        uiGlobalControlValues: uiState.globalControlValues || {},
                        uiCollapsedByElementId: uiState.collapsedByElementId || {},
                        uiMiniEditorCollapsed: uiState.uiMiniEditorCollapsed || {},
                    };
                    state.setPromptUIState(promptId, promptUIState);
                }
            }

            // Handle orphaned prompts (prompts not in any project)
            // Note: currentProjects was set above when getting state
            const orphanedPrompts = resolved.prompts.filter(p => {
                return !resolved.projects.some(proj => proj.prompts.includes(p.id)) &&
                       !currentProjects.some(proj => proj.prompts.includes(p.id));
            });
            
            if (orphanedPrompts.length > 0) {
                // Create a special "Imported Prompts" project for orphaned prompts
                const importProject: Project = {
                    id: `proj_import_${Date.now()}`,
                    name: 'Imported Prompts',
                    description: `Prompts imported on ${new Date().toLocaleDateString()}`,
                    prompts: orphanedPrompts.map(p => p.id),
                    tags: ['Imported'],
                    defaultPromptTemplate: '',
                    settings: {
                        autoSaveEnabled: true,
                        autoSaveInterval: 30,
                        exportFormat: 'json'
                    },
                    createdAt: new Date().toISOString()
                };
                addProject(importProject);
                // Select this project so imported prompts are visible
                setSelectedProject(importProject);
                setCurrentProject(importProject);
            }

            // Handle workspace UI state if applicable
            if (rawImportData.uiState && importAnalysis.type === 'workspace') {
                if (rawImportData.uiState.previewMode) {
                    setPreviewMode(rawImportData.uiState.previewMode);
                }
                if (rawImportData.uiState.helpPanelExpanded !== undefined) {
                    setUiHelpPanelExpanded(rawImportData.uiState.helpPanelExpanded);
                }
                if (rawImportData.uiState.panelLayout) {
                    setUiPanelLayout(rawImportData.uiState.panelLayout);
                }
                if (rawImportData.uiState.collapsedByElementId) {
                    setUiCollapsedByElementId(rawImportData.uiState.collapsedByElementId);
                }
                if (rawImportData.uiState.globalControlValues) {
                    setUiGlobalControlValues(rawImportData.uiState.globalControlValues);
                }
                
                // Restore workspace selection
                if (rawImportData.uiState.currentProjectId) {
                    const project = resolved.projects.find(p => p.id === rawImportData.uiState.currentProjectId);
                    if (project) {
                        setCurrentProject(project);
                        setSelectedProject(project);
                    }
                }
            } else if (resolved.projects.length === 1) {
                // If importing a single project, select it
                setCurrentProject(resolved.projects[0]);
                setSelectedProject(resolved.projects[0]);
            }

            // Show success message
            const projectCount = resolved.projects.length;
            const promptCount = resolved.prompts.length;
            let summary = '';
            if (projectCount > 0 && promptCount > 0) {
                summary = `Imported ${projectCount} project${projectCount > 1 ? 's' : ''} and ${promptCount} prompt${promptCount > 1 ? 's' : ''}`;
            } else if (projectCount > 0) {
                summary = `Imported ${projectCount} project${projectCount > 1 ? 's' : ''}`;
            } else if (promptCount > 0) {
                summary = `Imported ${promptCount} prompt${promptCount > 1 ? 's' : ''}`;
            }
            NotificationService.success(`${summary} successfully!`);

            // Clear modal state
            setShowImportPreview(false);
            setImportAnalysis(null);
            setRawImportData(null);
        } catch (error) {
            NotificationService.error(`Import failed: ${error}`);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
            <TopBar
                title="PromptStruct"
                subtitle="Project Browser"
                additionalButtons={(
                    <>
                        <Button 
                            variant="outline" 
                            onClick={() => setBrowserPanels({ showSearchBar: !browserPanels.showSearchBar })}
                            title={browserPanels.showSearchBar ? 'Hide Search Bar' : 'Show Search Bar'}
                        >
                            <Search className="w-4 h-4 mr-2" />
                            {browserPanels.showSearchBar ? 'Hide Search' : 'Show Search'}
                        </Button>
                        <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import
                        </Button>
                        <input
                            id="import-file"
                            type="file"
                            accept=".json"
                            onChange={handleImportProject}
                            className="hidden"
                        />
                        <Button variant="outline" onClick={() => setShowProjectTemplates(true)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Templates
                        </Button>
                    </>
                )}
            />

            {/* Search Section (full width) */}
            {browserPanels.showSearchBar && (
                <div className="panel-padding border-b">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="md:flex-1">
                            <EnhancedSearchBar
                                projects={projects}
                                prompts={prompts}
                                onSearchResults={setSearchResults}
                                onClearResults={clearSearchResults}
                            />
                        </div>
                        <div className="flex gap-2 self-end md:self-auto md:ml-4">
                            <Button variant="outline" onClick={() => setShowAdvancedSearch(true)}>
                                <Search className="w-4 h-4 mr-2" />
                                Advanced Search
                            </Button>
                            {searchResults && (
                                <Button variant="outline" onClick={clearSearchResults}>
                                    Clear Results
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup ref={panelGroupRef} direction="horizontal" autoSaveId="project-browser-layout" onLayout={(sizes) => {
                    if (sizes[0] < 8 && browserPanels.showProjects) setBrowserPanels({ showProjects: false });
                    if (sizes[2] < 8 && browserPanels.showDirectUsePreview) setBrowserPanels({ showDirectUsePreview: false });
                }}>
                    <ResizablePanel defaultSize={35} minSize={8} collapsible onCollapse={() => setBrowserPanels({ showProjects: false })} onExpand={() => setBrowserPanels({ showProjects: true })}>
                        <div className="h-full border-r panel-padding overflow-y-auto" ref={(el) => {
                            if (!el) return;
                            const ro = new ResizeObserver((entries) => {
                                for (const entry of entries) {
                                    const width = entry.contentRect.width;
                                    setCompactProjectsActions(width < 400);
                                }
                            });
                            ro.observe(el);
                        }}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">
                                    {searchResults ? 'Search Results' : 'Projects'}
                                </h3>
                                {!searchResults && (
                                    <div className="flex gap-2">
                                        {bulkProjectMode && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setBulkProjectMode(false);
                                                        setSelectedProjects(new Set());
                                                    }}
                                                    className={compactProjectsActions ? 'hidden' : 'inline-flex'}
                                                >
                                                    Exit Bulk Mode
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setBulkProjectMode(false);
                                                        setSelectedProjects(new Set());
                                                    }}
                                                    className={compactProjectsActions ? 'inline-flex' : 'hidden'}
                                                    title="Exit Bulk Mode"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                        {bulkProjectMode && selectedProjects.size > 0 && (
                                            <>
                                                <Button
                                                    onClick={handleBulkExportProjects}
                                                    disabled={selectedProjects.size === 0}
                                                    className={compactProjectsActions ? 'hidden' : 'inline-flex'}
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Export Selected
                                                </Button>
                                                <Button
                                                    onClick={handleBulkExportProjects}
                                                    disabled={selectedProjects.size === 0}
                                                    size="icon"
                                                    className={compactProjectsActions ? 'inline-flex' : 'hidden'}
                                                    title="Export Selected"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                        {!bulkProjectMode && (
                                            <>
                                                {projects.length > 0 && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setBulkProjectMode(true);
                                                                setSelectedProjects(new Set());
                                                            }}
                                                            className={compactProjectsActions ? 'hidden' : 'inline-flex'}
                                                        >
                                                            Bulk Mode
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => {
                                                                setBulkProjectMode(true);
                                                                setSelectedProjects(new Set());
                                                            }}
                                                            className={compactProjectsActions ? 'inline-flex' : 'hidden'}
                                                            title="Bulk Mode"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button onClick={() => setShowNewProjectForm(true)} className={compactProjectsActions ? 'hidden' : 'inline-flex'}>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    New Project
                                                </Button>
                                                <Button onClick={() => setShowNewProjectForm(true)} size="icon" className={compactProjectsActions ? 'inline-flex' : 'hidden'} title="New Project">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {/* Show Projects */}
                                {projectsWithFavourites.map((project) => (
                                    <Card
                                        key={project.id}
                                        onClick={() => !bulkProjectMode && setSelectedProject(project)}
                                        className={`transition-colors ${bulkProjectMode ? 'hover:bg-accent/50' : 'cursor-pointer'} ${selectedProject?.id === project.id ? 'bg-accent' : ''
                                            }`}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {bulkProjectMode && project.id !== 'virtual_favourites' && (
                                                        <Checkbox
                                                            checked={selectedProjects.has(project.id)}
                                                            onCheckedChange={() => handleBulkSelectProject(project.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    <FolderOpen className="w-4 h-4" />
                                                    <strong>{project.name}</strong>
                                                    {searchResults && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Project
                                                        </Badge>
                                                    )}
                                                </div>
                                                {project.id !== 'virtual_favourites' && !bulkProjectMode && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedProject(project);
                                                                setShowProjectSettings(true);
                                                            }}
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                                {project.tags.length > 0 && (
                                                    <>
                                                        <Tag className="w-3 h-3" />
                                                        <div className="flex gap-1">
                                                            {project.tags.slice(0, 2).map((tag) => (
                                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                            {project.tags.length > 2 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{project.tags.length - 2}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {/* Show Prompts in Search Results */}
                                {searchResults && filteredPrompts.map((prompt) => {
                                    const parentProject = projects.find(p => p.prompts.includes(prompt.id));
                                    return (
                                        <Card
                                            key={prompt.id}
                                            onClick={() => {
                                                if (parentProject) {
                                                    // Open in mini editor (default behavior)
                                                    setSelectedProject(parentProject);
                                                    setCurrentProject(parentProject);
                                                    setCurrentPrompt(prompt);
                                                    setMiniEditorContext({ 
                                                        projectId: parentProject.id, 
                                                        promptId: prompt.id 
                                                    });
                                                    // Ensure Direct Use Preview panel is visible
                                                    if (!browserPanels.showDirectUsePreview) {
                                                        setBrowserPanels({ showDirectUsePreview: true });
                                                    }
                                                }
                                            }}
                                            className="cursor-pointer transition-colors hover:bg-accent"
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        <strong>{prompt.name}</strong>
                                                        <Badge variant="outline" className="text-xs">
                                                            Prompt
                                                        </Badge>
                                                    </div>
                                                    {parentProject && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Open in main editor
                                                                setSelectedProject(parentProject);
                                                                setCurrentProject(parentProject);
                                                                setCurrentPrompt(prompt);
                                                                navigate('/editor');
                                                            }}
                                                            title="Open in main editor"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                                                    {parentProject && (
                                                        <>
                                                            <FolderOpen className="w-3 h-3" />
                                                            <span>in {parentProject.name}</span>
                                                        </>
                                                    )}
                                                    {prompt.tags.length > 0 && (
                                                        <>
                                                            <Tag className="w-3 h-3" />
                                                            <div className="flex gap-1">
                                                                {prompt.tags.slice(0, 2).map((tag) => (
                                                                    <Badge key={tag} variant="secondary" className="text-xs">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Prompts List */}
                    <ResizablePanel defaultSize={browserPanels.showDirectUsePreview ? 35 : 65} minSize={20}>
                        <div className="h-full panel-padding overflow-y-auto" id="prompts-panel" ref={(el) => {
                            if (!el) return;
                            const ro = new ResizeObserver((entries) => {
                                for (const entry of entries) {
                                    const width = entry.contentRect.width;
                                    setCompactActions(width < 520);
                                    // Compact prompt cards when width is less than 400px
                                    setCompactPromptCards(width < 400);
                                }
                            });
                            ro.observe(el);
                        }}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">
                                    {selectedProject ? `${selectedProject.name} - Prompts` : 'Select a Project'}
                                    {bulkMode && selectedPrompts.size > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                            ({selectedPrompts.size} selected)
                                        </span>
                                    )}
                                </h3>
                                <div className="flex gap-2" id="prompts-actions">
                                    {bulkMode && (
                                        <>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setBulkMode(false);
                                                    setSelectedPrompts(new Set());
                                                }}
                                                className={compactActions ? 'hidden' : 'inline-flex'}
                                            >
                                                Exit Bulk Mode
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    setBulkMode(false);
                                                    setSelectedPrompts(new Set());
                                                }}
                                                className={compactActions ? 'inline-flex' : 'hidden'}
                                                title="Exit Bulk Mode"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    {bulkMode && selectedPrompts.size > 0 && (
                                        <>
                                            <Button variant="outline" onClick={handleBulkExport} className={compactActions ? 'hidden' : 'inline-flex'}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Export Selected
                                            </Button>
                                            <Button variant="destructive" onClick={handleBulkDelete} className={compactActions ? 'hidden' : 'inline-flex'}>
                                                Delete Selected
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={handleBulkExport} className={compactActions ? 'inline-flex' : 'hidden'} title="Export Selected">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={handleBulkDelete} className={compactActions ? 'inline-flex' : 'hidden'} title="Delete Selected">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    {selectedProject && !bulkMode && (
                                        <>
                                            {projectPrompts.length > 0 && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setBulkMode(true);
                                                            setSelectedPrompts(new Set());
                                                        }}
                                                        className={compactActions ? 'hidden' : 'inline-flex'}
                                                    >
                                                        Bulk Mode
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => {
                                                            setBulkMode(true);
                                                            setSelectedPrompts(new Set());
                                                        }}
                                                        className={compactActions ? 'inline-flex' : 'hidden'}
                                                        title="Bulk Mode"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button onClick={() => handleCreatePrompt(selectedProject.id)} className={compactActions ? 'hidden' : 'inline-flex'}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                New Prompt
                                            </Button>
                                            <Button onClick={() => handleCreatePrompt(selectedProject.id)} size="icon" className={compactActions ? 'inline-flex' : 'hidden'} title="New Prompt">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedProject ? (
                                <div className="space-y-2">
                                    {projectPrompts.map((prompt) => (
                                        <Card
                                            key={prompt.id}
                                            onClick={() => {
                                                if (bulkMode) {
                                                    handleBulkSelect(prompt.id);
                                                } else {
                                                    // Open in mini editor (default behavior)
                                                    setCurrentProject(selectedProject);
                                                    setCurrentPrompt(prompt);
                                                    setMiniEditorContext({ 
                                                        projectId: selectedProject.id, 
                                                        promptId: prompt.id 
                                                    });
                                                    // Ensure Direct Use Preview panel is visible
                                                    if (!browserPanels.showDirectUsePreview) {
                                                        setBrowserPanels({ showDirectUsePreview: true });
                                                    }
                                                }
                                            }}
                                            className={`cursor-pointer transition-colors ${selectedPrompts.has(prompt.id) ? 'bg-accent' : ''
                                                }`}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        {bulkMode && (
                                                            <Checkbox
                                                                checked={selectedPrompts.has(prompt.id)}
                                                                onChange={() => handleBulkSelect(prompt.id)}
                                                            />
                                                        )}
                                                        <FileText className="w-4 h-4" />
                                                        {editingPrompt === prompt.id ? (
                                                            <Input
                                                                type="text"
                                                                value={editingPromptName}
                                                                onChange={(e) => setEditingPromptName(e.target.value)}
                                                                onBlur={() => handleRenamePrompt(prompt.id, editingPromptName)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleRenamePrompt(prompt.id, editingPromptName);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingPrompt(null);
                                                                        setEditingPromptName('');
                                                                    }
                                                                }}
                                                                className="h-6"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="font-medium">
                                                                {prompt.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!bulkMode && (
                                                        <div className="flex gap-1">
                                                            {/* Always show: Open in main editor button (first) */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Open in main editor
                                                                    setCurrentProject(selectedProject);
                                                                    setCurrentPrompt(prompt);
                                                                    navigate('/editor');
                                                                }}
                                                                title="Open in main editor"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Button>
                                                            
                                                            {compactPromptCards ? (
                                                                // Compact mode: Favorite and Rename in dropdown
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                            }}
                                                                            title="More options"
                                                                        >
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleToggleFavourite(prompt.id);
                                                                            }}
                                                                        >
                                                                            <Star className={`w-4 h-4 mr-2 ${prompt.tags.includes('Favourite') ? 'fill-current text-yellow-500' : ''}`} />
                                                                            {prompt.tags.includes('Favourite') ? 'Remove from favourites' : 'Add to favourites'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                startEditingPrompt(prompt);
                                                                            }}
                                                                        >
                                                                            <Edit className="w-4 h-4 mr-2" />
                                                                            Rename
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDuplicatePrompt(prompt);
                                                                            }}
                                                                        >
                                                                            <Copy className="w-4 h-4 mr-2" />
                                                                            Duplicate
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeletePromptId(prompt.id);
                                                                            }}
                                                                            className="text-destructive focus:text-destructive"
                                                                        >
                                                                            <X className="w-4 h-4 mr-2" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            ) : (
                                                                // Full mode: Show Favorite as button, Rename, Duplicate and Delete in dropdown
                                                                <>
                                                                    {/* Favorite button (second position) */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleFavourite(prompt.id);
                                                                        }}
                                                                        className={prompt.tags.includes('Favourite') ? 'text-yellow-500' : 'text-muted-foreground'}
                                                                        title={prompt.tags.includes('Favourite') ? 'Remove from favourites' : 'Add to favourites'}
                                                                    >
                                                                        <Star className={`w-4 h-4 ${prompt.tags.includes('Favourite') ? 'fill-current' : ''}`} />
                                                                    </Button>
                                                                    {/* Dropdown menu with Rename, Duplicate and Delete */}
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                }}
                                                                                title="More options"
                                                                            >
                                                                                <MoreVertical className="w-4 h-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    startEditingPrompt(prompt);
                                                                                }}
                                                                            >
                                                                                <Edit className="w-4 h-4 mr-2" />
                                                                                Rename
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDuplicatePrompt(prompt);
                                                                                }}
                                                                            >
                                                                                <Copy className="w-4 h-4 mr-2" />
                                                                                Duplicate
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDeletePromptId(prompt.id);
                                                                                }}
                                                                                className="text-destructive focus:text-destructive"
                                                                            >
                                                                                <X className="w-4 h-4 mr-2" />
                                                                                Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                                                    {prompt.tags.length > 0 && (
                                                        <>
                                                            <Tag className="w-3 h-3" />
                                                            <div className="flex gap-1">
                                                                {prompt.tags.slice(0, 2).map((tag) => (
                                                                    <Badge key={tag} variant="secondary" className="text-xs">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {projectPrompts.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8">
                                            No prompts yet. Create one to get started.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    Select a project to view its prompts.
                                </div>
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={30} minSize={8} collapsible onCollapse={() => setBrowserPanels({ showDirectUsePreview: false })} onExpand={() => setBrowserPanels({ showDirectUsePreview: true })}>
                        <DirectUsePanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* New Project Form */}
            <Dialog open={showNewProjectForm} onOpenChange={setShowNewProjectForm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                type="text"
                                placeholder="Project name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-tags">Tags (comma-separated)</Label>
                            <Input
                                id="project-tags"
                                type="text"
                                placeholder="Tags (comma-separated)"
                                value={newProjectTags}
                                onChange={(e) => setNewProjectTags(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewProjectForm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProject}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Project Settings Modal */}
            <ProjectSettings
                isOpen={showProjectSettings}
                onClose={() => setShowProjectSettings(false)}
                onDeleteRequest={() => {
                    if (selectedProject) {
                        setDeleteProjectId(selectedProject.id);
                    }
                }}
            />

            {/* Advanced Search Modal */}
            <AdvancedSearch
                isOpen={showAdvancedSearch}
                projects={projects}
                prompts={prompts}
                onSearchResults={setSearchResults}
                onClose={() => setShowAdvancedSearch(false)}
            />

            {/* Project Templates Modal */}
            <ProjectTemplates
                isOpen={showProjectTemplates}
                onClose={() => setShowProjectTemplates(false)}
                onCreateFromTemplate={handleCreateFromTemplate}
            />

            {/* Delete Project Confirmation Dialog */}
            <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{projects.find(p => p.id === deleteProjectId)?.name}"? This will also delete all prompts in this project. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeleteProject}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Prompt Confirmation Dialog */}
            <AlertDialog open={deletePromptId !== null} onOpenChange={(open) => !open && setDeletePromptId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{prompts.find(p => p.id === deletePromptId)?.name}"? This will also delete all versions of this prompt. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeletePrompt}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Import Preview Modal */}
            {importAnalysis && (
                <ImportPreviewModal
                    isOpen={showImportPreview}
                    onClose={() => {
                        setShowImportPreview(false);
                        setImportAnalysis(null);
                        setRawImportData(null);
                    }}
                    onConfirm={handleImportConfirm}
                    importAnalysis={importAnalysis}
                />
            )}
        </div>
    );
}
