import { create, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { StructuralElement, Project, Prompt, Version } from '@/types';

type StructuralElementWithOptionalSanitize = Omit<StructuralElement, 'autoRemoveEmptyLines'> & {
    autoRemoveEmptyLines?: boolean;
};

const ensureElementDefaults = (element: StructuralElementWithOptionalSanitize): StructuralElement => ({
    ...element,
    autoRemoveEmptyLines: element.autoRemoveEmptyLines ?? true,
});

const ensureStructureDefaults = (
    structure: StructuralElementWithOptionalSanitize[] = []
): StructuralElement[] => structure.map(ensureElementDefaults);

const ensureVersionStructureDefaults = (versions: Version[] = []): Version[] =>
    versions.map((version) => ({
        ...version,
        structure: ensureStructureDefaults(
            version.structure as unknown as StructuralElementWithOptionalSanitize[]
        ),
    }));

let persistSetRef: StoreApi<EditorState>['setState'] | null = null;

interface SyncState {
    isSignedIn: boolean;
    user: { id?: string; email?: string; name?: string } | null;
    quota?: { limit?: number; usage?: number; usageInDrive?: number } | null;
    status: 'idle' | 'syncing' | 'error' | 'success';
    lastSyncedAt?: string;
    errors?: string[];
    lastKnownRevisionMap: Record<string, string | undefined>; // fileName -> revisionId
    pendingPush: boolean;
}

interface BrowserPanelsState {
    showSearchBar: boolean;
    showProjects: boolean;
    showDirectUsePreview: boolean;
    miniEditorLayoutDirection: 'horizontal' | 'vertical' | 'hidden';
}

interface EditorPanelsState {
    showStructure: boolean;
    showPreview: boolean;
    showHelp: boolean;
}

interface MiniEditorState {
    lastOpenedContext?: { projectId?: string; promptId?: string } | null;
    state?: any;
}

interface PromptUIState {
    starredControls: Record<string, string[]>; // elementId -> array of control names
    starredTextBoxes: string[]; // array of elementIds
    uiGlobalControlValues: Record<string, any>; // control name -> value
    uiCollapsedByElementId: Record<string, { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } }>;
    uiMiniEditorCollapsed: Record<string, boolean>; // elementId -> collapsed state
}

interface EditorState {
    // Current working state
    structure: StructuralElement[];
    previewMode: 'clean' | 'raw';
    currentProject: Project | null;
    currentPrompt: Prompt | null;

    // Data management
    projects: Project[];
    prompts: Prompt[];
    versions: Version[];

    // UI state (persisted) - these are the "current" working state, synced with promptUIStates
    uiCollapsedByElementId: Record<string, { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } }>;
    uiHelpPanelExpanded: boolean;
    uiPreviewPanelExpanded: boolean;
    uiPanelLayout?: { left: number; right: number };
    uiGlobalControlValues: Record<string, any>;
    uiTextEditorHeight: Record<string, number>; // elementId -> height in pixels
    uiShowFavourites: boolean;
    uiMiniEditorCollapsed: Record<string, boolean>; // elementId -> collapsed state

    // Star system state (current working state, synced with promptUIStates)
    starredControls: Record<string, string[]>; // elementId -> array of control names
    starredTextBoxes: string[]; // array of elementIds

    // Per-prompt UI states (persisted per prompt)
    promptUIStates: Record<string, PromptUIState>; // promptId -> PromptUIState

    // Browser window panel visibility
    browserPanels: BrowserPanelsState;

    // Editor window panel visibility
    editorPanels: EditorPanelsState;

    // Mini editor session state
    miniEditor: MiniEditorState;

    // Actions
    setPreviewMode: (mode: 'clean' | 'raw') => void;
    updateStructuralElement: (id: string, updates: Partial<StructuralElement>) => void;
    addStructuralElement: (element: Omit<StructuralElement, 'id'>) => void;
    removeStructuralElement: (id: string) => void;
    toggleStructuralElement: (id: string) => void;
    updateStructure: (newStructure: StructuralElement[]) => void;

    // UI actions
    setUiCollapsedForElement: (id: string, collapsed: { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } }) => void;
    setUiHelpPanelExpanded: (expanded: boolean) => void;
    setUiPreviewPanelExpanded: (expanded: boolean) => void;
    setUiPanelLayout: (layout: { left: number; right: number } | undefined) => void;
    setUiGlobalControlValues: (values: Record<string, any>) => void;
    setUiCollapsedByElementId: (collapsed: Record<string, { text: boolean; controls: boolean; lastExpandedState?: { text: boolean; controls: boolean } }>) => void;
    setUiTextEditorHeight: (elementId: string, height: number) => void;
    setUiShowFavourites: (show: boolean) => void;
    setUiMiniEditorCollapsed: (elementId: string, collapsed: boolean) => void;

    // Star system actions
    toggleStarControl: (elementId: string, controlName: string) => void;
    toggleStarTextBox: (elementId: string) => void;

    // Prompt UI state management
    setPromptUIState: (promptId: string, uiState: Partial<PromptUIState>) => void;
    getPromptUIState: (promptId: string) => PromptUIState | undefined;

    // Browser panels actions
    setBrowserPanels: (panels: Partial<BrowserPanelsState>) => void;

    // Editor panels actions
    setEditorPanels: (panels: Partial<EditorPanelsState>) => void;

    // Mini editor actions
    setMiniEditorContext: (ctx: MiniEditorState['lastOpenedContext']) => void;
    setMiniEditorState: (state: any) => void;

    // Sync state
    sync: SyncState;
    setSyncState: (partial: Partial<SyncState>) => void;

    // Project management
    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    setCurrentProject: (project: Project | null) => void;
    setProjects: (projects: Project[]) => void;

    // Prompt management
    addPrompt: (prompt: Prompt) => void;
    updatePrompt: (id: string, updates: Partial<Prompt>) => void;
    deletePrompt: (id: string) => void;
    setCurrentPrompt: (prompt: Prompt | null) => void;
    setPrompts: (prompts: Prompt[]) => void;

    // Version management
    addVersion: (version: Version) => void;
    updateVersion: (id: string, updates: Partial<Version>) => void;
    deleteVersion: (id: string) => void;
    setVersions: (versions: Version[]) => void;

    // Utility functions
    saveCurrentPrompt: (isAutoSave?: boolean) => void;
    loadPromptVersion: (versionId: string) => void;
    createNewVersion: () => void;
    cleanupOldAutoSaves: () => void;
}

export const useEditorStore = create<EditorState>()(
    persist(
        (set, get) => {
            persistSetRef = set;
            return {
            // Initial state
            structure: [
                {
                    id: 'struct_1',
                    name: 'Persona',
                    enabled: true,
                    content: 'You are a master storyteller. Your task is to create compelling characters based on the following traits.',
                    autoRemoveEmptyLines: true,
                },
                {
                    id: 'struct_2',
                    name: 'Core Traits',
                    enabled: true,
                    content: 'The character is a {{select:Class:Warrior|Mage|Rogue}} of the {{text:Race:Elven}} race. They are known for their {{text:Key_Virtue:Bravery}}.',
                    autoRemoveEmptyLines: true,
                },
                {
                    id: 'struct_3',
                    name: 'Extra Details',
                    enabled: false,
                    content: '{{toggle:Add_Secret}}They harbor a dark secret: they are secretly afraid of {{text:Secret_Fear:spiders}}.{{/toggle:Add_Secret}}',
                    autoRemoveEmptyLines: true,
                }
            ],
            previewMode: 'clean',
            currentProject: null,
            currentPrompt: null,
            projects: [],
            prompts: [],
            versions: [],
            uiCollapsedByElementId: {},
            uiHelpPanelExpanded: true,
            uiPreviewPanelExpanded: true,
            uiPanelLayout: undefined,
            uiGlobalControlValues: {},
            uiTextEditorHeight: {},
            uiShowFavourites: true,
            uiMiniEditorCollapsed: {},
            starredControls: {},
            starredTextBoxes: [],
            promptUIStates: {},
            browserPanels: {
                showSearchBar: true,
                showProjects: true,
                showDirectUsePreview: true,
                miniEditorLayoutDirection: 'vertical',
            },
            editorPanels: {
                showStructure: true,
                showPreview: true,
                showHelp: true,
            },
            miniEditor: {
                lastOpenedContext: null,
                state: undefined,
            },
            sync: {
                isSignedIn: false,
                user: null,
                quota: null,
                status: 'idle',
                lastSyncedAt: undefined,
                errors: [],
                lastKnownRevisionMap: {},
                pendingPush: false,
            },

            // Preview mode
            setPreviewMode: (mode) => set({ previewMode: mode }),

            // Structural element management
            updateStructuralElement: (id, updates) =>
                set((state) => ({
                    structure: state.structure.map((element) =>
                        element.id === id ? { ...element, ...updates } : element
                    ),
                })),

            addStructuralElement: (element) =>
                set((state) => ({
                    structure: [
                        ...state.structure,
                        {
                            ...element,
                            // Preserve provided id if present (useful for tests); otherwise generate one
                            id: (element as any).id ?? `struct_${Date.now()}`,
                            autoRemoveEmptyLines: element.autoRemoveEmptyLines ?? true,
                        },
                    ],
                })),

            removeStructuralElement: (id) =>
                set((state) => ({
                    structure: state.structure.filter((element) => element.id !== id),
                })),

            toggleStructuralElement: (id) =>
                set((state) => ({
                    structure: state.structure.map((element) =>
                        element.id === id ? { ...element, enabled: !element.enabled } : element
                    ),
                })),

            updateStructure: (newStructure) => set({ structure: newStructure }),

            // UI actions
            setUiCollapsedForElement: (id, collapsed) =>
                set((state) => {
                    const updatedState: Partial<EditorState> = {
                        uiCollapsedByElementId: { ...state.uiCollapsedByElementId, [id]: collapsed },
                    };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                uiCollapsedByElementId: { ...promptUIState.uiCollapsedByElementId, [id]: collapsed },
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            setUiHelpPanelExpanded: (expanded) => set({ uiHelpPanelExpanded: expanded }),
            setUiPreviewPanelExpanded: (expanded) => set({ uiPreviewPanelExpanded: expanded }),
            setUiPanelLayout: (layout) => set({ uiPanelLayout: layout }),
            setUiGlobalControlValues: (values) =>
                set((state) => {
                    const updatedState: Partial<EditorState> = { uiGlobalControlValues: values };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                uiGlobalControlValues: values,
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            setUiCollapsedByElementId: (collapsed) =>
                set((state) => {
                    const updatedState: Partial<EditorState> = { uiCollapsedByElementId: collapsed };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                uiCollapsedByElementId: collapsed,
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            setUiTextEditorHeight: (elementId, height) =>
                set((state) => ({
                    uiTextEditorHeight: { ...state.uiTextEditorHeight, [elementId]: height },
                })),
            setUiShowFavourites: (show) => set({ uiShowFavourites: show }),
            setUiMiniEditorCollapsed: (elementId, collapsed) =>
                set((state) => {
                    const updatedState: Partial<EditorState> = {
                        uiMiniEditorCollapsed: { ...state.uiMiniEditorCollapsed, [elementId]: collapsed },
                    };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                uiMiniEditorCollapsed: { ...promptUIState.uiMiniEditorCollapsed, [elementId]: collapsed },
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            toggleStarControl: (elementId, controlName) =>
                set((state) => {
                    const currentStarred = Array.isArray(state.starredControls[elementId]) ? state.starredControls[elementId] : [];
                    const newStarred = [...currentStarred];
                    const index = newStarred.indexOf(controlName);
                    if (index > -1) {
                        newStarred.splice(index, 1);
                    } else {
                        newStarred.push(controlName);
                    }
                    const updatedState: Partial<EditorState> = {
                        starredControls: {
                            ...state.starredControls,
                            [elementId]: newStarred,
                        },
                    };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                starredControls: {
                                    ...promptUIState.starredControls,
                                    [elementId]: newStarred,
                                },
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            toggleStarTextBox: (elementId) =>
                set((state) => {
                    const currentStarredTextBoxes = Array.isArray(state.starredTextBoxes) ? state.starredTextBoxes : [];
                    const newStarredTextBoxes = [...currentStarredTextBoxes];
                    const index = newStarredTextBoxes.indexOf(elementId);
                    if (index > -1) {
                        newStarredTextBoxes.splice(index, 1);
                    } else {
                        newStarredTextBoxes.push(elementId);
                    }
                    const updatedState: Partial<EditorState> = { starredTextBoxes: newStarredTextBoxes };
                    
                    // Also update promptUIStates for current prompt
                    if (state.currentPrompt) {
                        const promptUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        updatedState.promptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...promptUIState,
                                starredTextBoxes: newStarredTextBoxes,
                            },
                        };
                    }
                    
                    return updatedState;
                }),
            setPromptUIState: (promptId, uiState) =>
                set((state) => ({
                    promptUIStates: {
                        ...state.promptUIStates,
                        [promptId]: {
                            ...(state.promptUIStates[promptId] || {
                                starredControls: {},
                                starredTextBoxes: [],
                                uiGlobalControlValues: {},
                                uiCollapsedByElementId: {},
                                uiMiniEditorCollapsed: {},
                            }),
                            ...uiState,
                        },
                    },
                })),
            getPromptUIState: (promptId) => {
                const state = get();
                return state.promptUIStates[promptId];
            },
            setBrowserPanels: (panels) => set((state) => ({ browserPanels: { ...state.browserPanels, ...panels } })),
            setEditorPanels: (panels) => set((state) => ({ editorPanels: { ...state.editorPanels, ...panels } })),
            setMiniEditorContext: (ctx) => set((state) => ({ miniEditor: { ...state.miniEditor, lastOpenedContext: ctx } })),
            setMiniEditorState: (s) => set((state) => ({ miniEditor: { ...state.miniEditor, state: s } })),
            setSyncState: (partial) => set((state) => ({ sync: { ...state.sync, ...partial } })),

            // Project management
            addProject: (project) =>
                set((state) => ({
                    projects: [...state.projects, project],
                })),

            updateProject: (id, updates) =>
                set((state) => ({
                    projects: state.projects.map((project) =>
                        project.id === id ? { ...project, ...updates } : project
                    ),
                })),

            deleteProject: (id) =>
                set((state) => ({
                    projects: state.projects.filter((project) => project.id !== id),
                    prompts: state.prompts.filter((prompt) => {
                        const project = state.projects.find(p => p.id === id);
                        return project ? !project.prompts.includes(prompt.id) : true;
                    }),
                })),

            setCurrentProject: (project) => set({ currentProject: project }),
            setProjects: (projects) => set({ projects }),

            // Prompt management
            addPrompt: (prompt) =>
                set((state) => ({
                    prompts: [...state.prompts, prompt],
                })),

            updatePrompt: (id, updates) =>
                set((state) => ({
                    prompts: state.prompts.map((prompt) =>
                        prompt.id === id ? { ...prompt, ...updates } : prompt
                    ),
                })),

            deletePrompt: (id) =>
                set((state) => {
                    const newPromptUIStates = { ...state.promptUIStates };
                    delete newPromptUIStates[id];
                    return {
                        prompts: state.prompts.filter((prompt) => prompt.id !== id),
                        versions: state.versions.filter((version) => version.promptId !== id),
                        promptUIStates: newPromptUIStates,
                    };
                }),

            setCurrentPrompt: (prompt) => {
                const state = get();
                
                // Save current UI state to previous prompt before switching (if a prompt was open)
                if (state.currentPrompt) {
                    const currentPromptUIState: PromptUIState = {
                        starredControls: { ...state.starredControls },
                        starredTextBoxes: [...state.starredTextBoxes],
                        uiGlobalControlValues: { ...state.uiGlobalControlValues },
                        uiCollapsedByElementId: { ...state.uiCollapsedByElementId },
                        uiMiniEditorCollapsed: { ...state.uiMiniEditorCollapsed },
                    };
                    state.setPromptUIState(state.currentPrompt.id, currentPromptUIState);
                    
                    // Save current structure to previous prompt before switching (if a prompt was open)
                    if (state.structure.length > 0) {
                        // Auto-save current structure to previous prompt
                        const existingAutoSave = state.versions.find(v =>
                            v.promptId === state.currentPrompt!.id && v.isAutoSave === true
                        );

                        const structureToSave = state.structure.map(el => ({ ...el })); // Deep clone

                        if (existingAutoSave) {
                            // Update existing auto-save
                            state.updateVersion(existingAutoSave.id, {
                                structure: structureToSave,
                                createdAt: new Date().toISOString(),
                            });
                        } else {
                            // Create new auto-save
                            const autoSaveVersion: Version = {
                                id: `ver_${Date.now()}`,
                                promptId: state.currentPrompt.id,
                                createdAt: new Date().toISOString(),
                                structure: structureToSave,
                                isAutoSave: true,
                            };
                            state.addVersion(autoSaveVersion);
                        }
                    }
                }

                // Load new prompt's structure and UI state
                let structureToLoad: StructuralElement[] = [];
                let uiStateToLoad: PromptUIState = {
                    starredControls: {},
                    starredTextBoxes: [],
                    uiGlobalControlValues: {},
                    uiCollapsedByElementId: {},
                    uiMiniEditorCollapsed: {},
                };
                
                if (prompt) {
                    // Load UI state for the new prompt
                    const savedUIState = state.promptUIStates[prompt.id];
                    if (savedUIState) {
                        uiStateToLoad = {
                            starredControls: { ...savedUIState.starredControls },
                            starredTextBoxes: [...savedUIState.starredTextBoxes],
                            uiGlobalControlValues: { ...savedUIState.uiGlobalControlValues },
                            uiCollapsedByElementId: { ...savedUIState.uiCollapsedByElementId },
                            uiMiniEditorCollapsed: { ...savedUIState.uiMiniEditorCollapsed },
                        };
                    }
                    
                    // Try to load from currentVersion first
                    if (prompt.currentVersion) {
                        const currentVersion = state.versions.find(v => v.id === prompt.currentVersion);
                        if (currentVersion) {
                            structureToLoad = currentVersion.structure.map(el => ({ ...el })); // Deep clone
                        }
                    }
                    
                    // If no currentVersion or version not found, try latest non-autosave version
                    if (structureToLoad.length === 0) {
                        const nonAutoSaveVersions = state.versions
                            .filter(v => v.promptId === prompt.id && !v.isAutoSave)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        
                        if (nonAutoSaveVersions.length > 0) {
                            structureToLoad = nonAutoSaveVersions[0].structure.map(el => ({ ...el })); // Deep clone
                        }
                    }
                    
                    // If still no structure, try latest auto-save
                    if (structureToLoad.length === 0) {
                        const autoSaveVersions = state.versions
                            .filter(v => v.promptId === prompt.id && v.isAutoSave === true)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        
                        if (autoSaveVersions.length > 0) {
                            structureToLoad = autoSaveVersions[0].structure.map(el => ({ ...el })); // Deep clone
                        }
                    }
                }
                
                // If no structure found, use empty array (will be initialized when user starts editing)
                const normalizedStructure = ensureStructureDefaults(structureToLoad);

                set({ 
                    currentPrompt: prompt,
                    structure: normalizedStructure.length > 0 ? normalizedStructure : [],
                    starredControls: uiStateToLoad.starredControls,
                    starredTextBoxes: uiStateToLoad.starredTextBoxes,
                    uiGlobalControlValues: uiStateToLoad.uiGlobalControlValues,
                    uiCollapsedByElementId: uiStateToLoad.uiCollapsedByElementId,
                    uiMiniEditorCollapsed: uiStateToLoad.uiMiniEditorCollapsed,
                });
            },
            setPrompts: (prompts) => set({ prompts }),

            // Version management
            addVersion: (version) =>
                set((state) => ({
                    versions: [...state.versions, version],
                })),

            updateVersion: (id, updates) =>
                set((state) => ({
                    versions: state.versions.map((version) =>
                        version.id === id ? { ...version, ...updates } : version
                    ),
                })),

            deleteVersion: (id) =>
                set((state) => ({
                    versions: state.versions.filter((version) => version.id !== id),
                })),
            setVersions: (versions) => set({ versions }),

            // Utility functions
            saveCurrentPrompt: (isAutoSave: boolean = false) => {
                const state = get();
                if (!state.currentPrompt) return;

                // Create a new version with current structure
                const newVersion: Version = {
                    id: `ver_${Date.now()}`,
                    promptId: state.currentPrompt.id,
                    createdAt: new Date().toISOString(),
                    structure: [...state.structure],
                    isAutoSave,
                };

                if (isAutoSave) {
                    // For auto-save: replace the last auto-save if it exists
                    const existingAutoSave = state.versions.find(v =>
                        v.promptId === state.currentPrompt!.id && v.isAutoSave === true
                    );

                    if (existingAutoSave) {
                        // Update the existing auto-save instead of creating a new one
                        state.updateVersion(existingAutoSave.id, {
                            structure: [...state.structure],
                            createdAt: new Date().toISOString(),
                        });
                    } else {
                        // No existing auto-save, create a new one
                        state.addVersion(newVersion);
                    }
                } else {
                    // For manual save: always create a new version
                    state.addVersion(newVersion);

                    // Update the prompt's current version
                    state.updatePrompt(state.currentPrompt.id, {
                        currentVersion: newVersion.id,
                        versions: [...(state.currentPrompt.versions || []), newVersion.id],
                    });
                }
            },

            loadPromptVersion: (versionId) => {
                const state = get();
                const version = state.versions.find(v => v.id === versionId);
                if (version) {
                    set({ structure: [...version.structure] });
                }
            },

            createNewVersion: () => {
                const state = get();
                if (!state.currentPrompt) return;

                // Save current state as new version
                state.saveCurrentPrompt(false); // Manual save
            },

            // Clean up old auto-saves (keep only the latest one per prompt)
            cleanupOldAutoSaves: () => {
                const state = get();
                const promptIds = [...new Set(state.versions.map(v => v.promptId))];

                promptIds.forEach(promptId => {
                    const autoSaves = state.versions
                        .filter(v => v.promptId === promptId && v.isAutoSave === true)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                    // Keep only the latest auto-save, delete the rest
                    if (autoSaves.length > 1) {
                        const toDelete = autoSaves.slice(1);
                        toDelete.forEach(autoSave => {
                            state.deleteVersion(autoSave.id);
                        });
                    }
                });
            },
            };
        },
        {
            name: 'promptstruct-storage',
            partialize: (state) => ({
                // Persist core session so refresh restores user's workspace
                structure: state.structure,
                previewMode: state.previewMode,
                projects: state.projects,
                prompts: state.prompts,
                versions: state.versions,
                currentProject: state.currentProject,
                currentPrompt: state.currentPrompt,
                uiCollapsedByElementId: state.uiCollapsedByElementId,
                uiHelpPanelExpanded: state.uiHelpPanelExpanded,
                uiPreviewPanelExpanded: state.uiPreviewPanelExpanded,
                uiPanelLayout: state.uiPanelLayout,
                uiGlobalControlValues: state.uiGlobalControlValues,
                uiTextEditorHeight: state.uiTextEditorHeight,
                uiShowFavourites: state.uiShowFavourites,
                uiMiniEditorCollapsed: state.uiMiniEditorCollapsed,
                starredControls: state.starredControls,
                starredTextBoxes: state.starredTextBoxes,
                promptUIStates: state.promptUIStates,
                browserPanels: state.browserPanels,
                editorPanels: state.editorPanels,
                miniEditor: state.miniEditor,
                sync: state.sync,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state || !persistSetRef) {
                    return;
                }

                persistSetRef((current) => ({
                    ...current,
                    structure: ensureStructureDefaults(
                        state.structure as unknown as StructuralElementWithOptionalSanitize[]
                    ),
                    versions: ensureVersionStructureDefaults(state.versions),
                }));
            },
        }
    )
);

// Export PromptUIState type for use in other files
export type { PromptUIState };