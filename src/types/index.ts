// Core data types for PromptStruct

export interface ProjectSettings {
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    exportFormat: 'json' | 'markdown' | 'txt';
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    prompts: string[];
    tags: string[];
    defaultPromptTemplate?: string;
    settings?: ProjectSettings;
    createdAt: string;
}

export interface Prompt {
    id: string;
    name: string;
    versions: string[];
    currentVersion: string;
    tags: string[];
    createdAt: string;
}

export interface StructuralElement {
    id: string;
    name: string;
    enabled: boolean;
    content: string;
    autoRemoveEmptyLines: boolean;
    linkedVariable?: string; // Variable name (e.g., "#imgGen_Face_modifer") when element is linked
}

export interface Version {
    id: string;
    promptId: string;
    createdAt: string;
    structure: StructuralElement[];
    isAutoSave?: boolean; // Flag to distinguish auto-saves from manual saves
}

// Control types for the {{...}} syntax
export interface ControlElement {
    type: 'text' | 'toggle' | 'slider' | 'select';
    name: string;
    defaultValue?: string;
    options?: string[]; // for select type
    min?: number; // for slider type
    max?: number; // for slider type
    start?: number; // for toggle type
    end?: number; // for toggle type
}

export interface ParsedControl {
    element: ControlElement;
    startIndex: number;
    endIndex: number;
    content?: string; // for toggle blocks
}

// Variable type for global variable store
export interface Variable {
    name: string;
    value: string;
    createdAt: string;
    updatedAt: string;
}

// Editor state
export interface EditorState {
    currentProject: Project | null;
    currentPrompt: Prompt | null;
    currentVersion: Version | null;
    structure: StructuralElement[];
    previewMode: 'clean' | 'raw';
}

// Export/Import types
export interface WorkspaceExport {
    projects: Project[];
    prompts: Prompt[];
    versions: Version[];
    variables?: Record<string, string>; // variable name -> value
    uiState: {
        previewMode: 'clean' | 'raw';
        currentProjectId: string | null;
        currentPromptId: string | null;
        helpPanelExpanded: boolean;
        previewPanelExpanded: boolean;
        panelLayout?: { left: number; right: number };
        collapsedByElementId: Record<string, { text: boolean; controls: boolean }>;
        globalControlValues: Record<string, any>;
    };
    exportedAt: string;
}

export interface ProjectExport {
    project: Project;
    prompts: Prompt[];
    versions: Version[];
    exportedAt: string;
    version: 'metadata' | 'last' | 'full';
    type?: 'single' | 'bulk';
}

export interface PromptsExport {
    prompts: Prompt[];
    versions: Version[];
    exportedAt: string;
    count: number;
}

export interface PromptExport {
    prompt: Prompt;
    structure?: StructuralElement[];
    versions?: Version[];
    currentStructure?: StructuralElement[];
    exportedAt: string;
    version: 'current' | 'last' | 'all';
}

// Import types
export interface ImportConflict {
    id: string;
    name: string;
    type: 'project' | 'prompt' | 'version';
    resolution: 'overwrite' | 'skip' | 'duplicate';
}

export interface ImportAnalysis {
    type: 'prompt' | 'project' | 'workspace' | 'bulk-prompts' | 'bulk-projects';
    projects: Project[];
    prompts: Prompt[];
    versions: Version[];
    conflicts: ImportConflict[];
}

export interface TemplateExport {
    templates: ProjectTemplate[];
    exportedAt: string;
    count: number;
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    projectData: {
        name: string;
        description: string;
        tags: string[];
        defaultPromptTemplate: string;
        settings: any;
    };
    prompts: Array<{
        name: string;
        tags: string[];
        versions: Array<{
            structure: any[];
        }>;
    }>;
    isBuiltIn: boolean;
    createdAt: string;
    usageCount: number;
}