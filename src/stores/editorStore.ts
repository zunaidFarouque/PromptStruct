import { create, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { StructuralElement, Project, Prompt, Version } from '@/types';
import { parseControlSyntax } from '@/utils/syntaxParser';

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
    modifiedStructure?: StructuralElement[]; // working copy of structure with modifications
    originalStructure?: StructuralElement[]; // original saved structure for comparison
    originalControlValues?: Record<string, any>; // original control values for comparison
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
    
    // Reset functions
    resetElementContent: (elementId: string) => void;
    resetControlValue: (controlName: string) => void;
    getOriginalStructure: () => StructuralElement[] | undefined;
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
                set((state) => {
                    const updatedStructure = state.structure.map((element) =>
                        element.id === id ? { ...element, ...updates } : element
                    );
                    
                    // Also update modifiedStructure in promptUIStates if we have a current prompt
                    let updatedPromptUIStates = state.promptUIStates;
                    if (state.currentPrompt) {
                        const currentUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        
                        updatedPromptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...currentUIState,
                                modifiedStructure: updatedStructure.map(el => ({ ...el })), // Deep clone
                                // Preserve originalStructure and originalControlValues
                                originalStructure: currentUIState.originalStructure,
                                originalControlValues: currentUIState.originalControlValues,
                            },
                        };
                    }
                    
                    return {
                        structure: updatedStructure,
                        promptUIStates: updatedPromptUIStates,
                    };
                }),

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
                
                // Save current UI state and modified structure to previous prompt before switching (if a prompt was open)
                if (state.currentPrompt) {
                    const structureToSave = state.structure.length > 0 ? state.structure.map(el => ({ ...el })) : undefined; // Deep clone
                    const controlValuesToSave = { ...state.uiGlobalControlValues }; // Deep clone
                    
                    const currentPromptUIState: PromptUIState = {
                        starredControls: { ...state.starredControls },
                        starredTextBoxes: [...state.starredTextBoxes],
                        uiGlobalControlValues: controlValuesToSave,
                        uiCollapsedByElementId: { ...state.uiCollapsedByElementId },
                        uiMiniEditorCollapsed: { ...state.uiMiniEditorCollapsed },
                        modifiedStructure: structureToSave,
                    };
                    
                    // Preserve originalStructure if it exists
                    const existingUIState = state.promptUIStates[state.currentPrompt.id];
                    if (existingUIState?.originalStructure) {
                        currentPromptUIState.originalStructure = existingUIState.originalStructure;
                    }
                    if (existingUIState?.originalControlValues) {
                        currentPromptUIState.originalControlValues = existingUIState.originalControlValues;
                    }
                    
                    state.setPromptUIState(state.currentPrompt.id, currentPromptUIState);
                    
                    // Also auto-save current structure to previous prompt (for backward compatibility)
                    if (structureToSave && structureToSave.length > 0) {
                        const existingAutoSave = state.versions.find(v =>
                            v.promptId === state.currentPrompt!.id && v.isAutoSave === true
                        );

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
                let originalStructureToStore: StructuralElement[] | undefined = undefined;
                let originalControlValuesToStore: Record<string, any> | undefined = undefined;
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
                        
                        // Prioritize modifiedStructure if it exists
                        if (savedUIState.modifiedStructure && savedUIState.modifiedStructure.length > 0) {
                            structureToLoad = savedUIState.modifiedStructure.map(el => ({ ...el })); // Deep clone
                        }
                        
                        // Preserve originalStructure and originalControlValues if they exist
                        if (savedUIState.originalStructure) {
                            originalStructureToStore = savedUIState.originalStructure.map(el => ({ ...el })); // Deep clone
                        } else if (savedUIState.modifiedStructure && savedUIState.modifiedStructure.length > 0) {
                            // If we have modifiedStructure but no originalStructure, use modifiedStructure as original
                            // This handles the case where originalStructure wasn't set initially
                            originalStructureToStore = savedUIState.modifiedStructure.map(el => ({ ...el })); // Deep clone
                        }
                        if (savedUIState.originalControlValues) {
                            originalControlValuesToStore = { ...savedUIState.originalControlValues };
                        }
                    }
                    
                    // If no modifiedStructure, load from version
                    if (structureToLoad.length === 0) {
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
                        
                        // Store loaded structure as originalStructure if not already stored
                        if (structureToLoad.length > 0 && !originalStructureToStore) {
                            originalStructureToStore = structureToLoad.map(el => ({ ...el })); // Deep clone
                        }
                        
                        // Store original control values - use saved UI state values if available, otherwise use defaults from structure
                        if (structureToLoad.length > 0 && !originalControlValuesToStore) {
                            // First, try to use the saved UI state's control values (these are the actual saved values from editor)
                            if (savedUIState && savedUIState.uiGlobalControlValues && Object.keys(savedUIState.uiGlobalControlValues).length > 0) {
                                originalControlValuesToStore = { ...savedUIState.uiGlobalControlValues };
                            } else {
                                // Fallback to default values from structure
                                originalControlValuesToStore = {};
                                structureToLoad.forEach(element => {
                                    try {
                                        const controls = parseControlSyntax(element.content);
                                        controls.forEach((control: any) => {
                                            if (control.element.defaultValue !== undefined) {
                                                originalControlValuesToStore![control.element.name] = control.element.defaultValue;
                                            }
                                        });
                                    } catch (e) {
                                        // Ignore parse errors
                                    }
                                });
                            }
                        }
                    }
                }
                
                // If no structure found, use empty array (will be initialized when user starts editing)
                const normalizedStructure = ensureStructureDefaults(structureToLoad);

                // Update promptUIState with originalStructure and originalControlValues if we have them
                // Also, if originalControlValues doesn't exist yet, store the loaded UI state's control values as original
                if (prompt) {
                    const updatedUIState: Partial<PromptUIState> = {
                        ...uiStateToLoad,
                    };
                    if (originalStructureToStore) {
                        updatedUIState.originalStructure = originalStructureToStore;
                    }
                    // Store original control values - use the loaded UI state values as the baseline
                    if (originalControlValuesToStore) {
                        updatedUIState.originalControlValues = originalControlValuesToStore;
                    } else if (uiStateToLoad.uiGlobalControlValues && Object.keys(uiStateToLoad.uiGlobalControlValues).length > 0) {
                        // If no originalControlValues stored yet, use the loaded control values as original
                        updatedUIState.originalControlValues = { ...uiStateToLoad.uiGlobalControlValues };
                    }
                    state.setPromptUIState(prompt.id, updatedUIState);
                }

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
            
            // Reset functions
            resetElementContent: (elementId: string) => {
                const state = get();
                if (!state.currentPrompt) return;
                
                const uiState = state.promptUIStates[state.currentPrompt.id];
                if (!uiState?.originalStructure) {
                    // If no originalStructure, try to get it from the current structure (first time loading)
                    // This shouldn't happen, but as a fallback, use current structure as original
                    const currentElement = state.structure.find(el => el.id === elementId);
                    if (currentElement) {
                        // Store current as original for future resets
                        const updatedUIState: Partial<PromptUIState> = {
                            ...uiState,
                            originalStructure: state.structure.map(el => ({ ...el })),
                        };
                        state.setPromptUIState(state.currentPrompt.id, updatedUIState);
                    }
                    return;
                }
                
                const originalElement = uiState.originalStructure.find(el => el.id === elementId);
                if (!originalElement) return;
                
                // Restore original content - use set directly to ensure update happens
                set((state) => {
                    const updatedStructure = state.structure.map((element) =>
                        element.id === elementId ? { ...element, content: originalElement.content } : element
                    );
                    
                    // Update modifiedStructure in promptUIStates
                    let updatedPromptUIStates = state.promptUIStates;
                    if (state.currentPrompt) {
                        const currentUIState = state.promptUIStates[state.currentPrompt.id] || {
                            starredControls: {},
                            starredTextBoxes: [],
                            uiGlobalControlValues: {},
                            uiCollapsedByElementId: {},
                            uiMiniEditorCollapsed: {},
                        };
                        
                        updatedPromptUIStates = {
                            ...state.promptUIStates,
                            [state.currentPrompt.id]: {
                                ...currentUIState,
                                modifiedStructure: updatedStructure.map(el => ({ ...el })),
                                originalStructure: currentUIState.originalStructure,
                                originalControlValues: currentUIState.originalControlValues,
                            },
                        };
                    }
                    
                    return {
                        structure: updatedStructure,
                        promptUIStates: updatedPromptUIStates,
                    };
                });
            },
            
            resetControlValue: (controlName: string) => {
                const state = get();
                if (!state.currentPrompt) return;
                
                const uiState = state.promptUIStates[state.currentPrompt.id];
                if (!uiState?.originalControlValues) return;
                
                const originalValue = uiState.originalControlValues[controlName];
                
                // Restore original value - if originalValue is undefined, remove the key
                const updatedControlValues = { ...state.uiGlobalControlValues };
                if (originalValue === undefined) {
                    delete updatedControlValues[controlName];
                } else {
                    updatedControlValues[controlName] = originalValue;
                }
                
                // Update both global state and promptUIState
                set((state) => {
                    const promptUIState = state.promptUIStates[state.currentPrompt!.id] || {
                        starredControls: {},
                        starredTextBoxes: [],
                        uiGlobalControlValues: {},
                        uiCollapsedByElementId: {},
                        uiMiniEditorCollapsed: {},
                    };
                    
                    const updatedPromptUIState = {
                        ...promptUIState,
                        uiGlobalControlValues: { ...updatedControlValues },
                    };
                    
                    return {
                        uiGlobalControlValues: updatedControlValues,
                        promptUIStates: {
                            ...state.promptUIStates,
                            [state.currentPrompt!.id]: updatedPromptUIState,
                        },
                    };
                });
            },
            
            getOriginalStructure: () => {
                const state = get();
                if (!state.currentPrompt) return undefined;
                
                const uiState = state.promptUIStates[state.currentPrompt.id];
                return uiState?.originalStructure;
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