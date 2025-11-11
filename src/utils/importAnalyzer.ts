import { Project, Prompt, Version, ImportAnalysis, ImportConflict } from '@/types';

export function analyzeImportData(
    data: any,
    existingProjects: Project[],
    existingPrompts: Prompt[],
    existingVersions: Version[]
): ImportAnalysis {
    // Detect import type and extract data
    let type: ImportAnalysis['type'] = 'prompt';
    let projects: Project[] = [];
    let prompts: Prompt[] = [];
    let versions: Version[] = [];

    if (data.project && !data.projects) {
        // Single project export
        type = 'project';
        projects = [data.project];
        prompts = data.prompts || [];
        versions = data.versions || [];
    } else if (data.projects && Array.isArray(data.projects)) {
        if (data.uiState) {
            // Full workspace export
            type = 'workspace';
            projects = data.projects;
            prompts = data.prompts || [];
            versions = data.versions || [];
        } else if (data.projects.length === 1) {
            // Single project (but in projects array)
            type = 'project';
            projects = data.projects;
            prompts = data.prompts || [];
            versions = data.versions || [];
        } else {
            // Multiple projects
            type = 'bulk-projects';
            projects = data.projects;
            prompts = data.prompts || [];
            versions = data.versions || [];
        }
    } else if (data.prompts && Array.isArray(data.prompts)) {
        if (data.prompts.length === 1) {
            // Single prompt (but in prompts array)
            type = 'prompt';
            prompts = data.prompts;
            versions = data.versions || [];
        } else {
            // Multiple prompts
            type = 'bulk-prompts';
            prompts = data.prompts;
            versions = data.versions || [];
        }
    } else if (data.prompt) {
        // Single prompt export
        type = 'prompt';
        prompts = [data.prompt];
        versions = data.versions || [];
        
        // Handle root-level structure field (from 'current' scope exports)
        // Convert it to a Version if no versions exist
        if (versions.length === 0) {
            if (data.structure && Array.isArray(data.structure)) {
                const structureVersion: Version = {
                    id: `ver_${Date.now()}_import`,
                    promptId: data.prompt.id,
                    createdAt: data.exportedAt || new Date().toISOString(),
                    structure: data.structure,
                    isAutoSave: false
                };
                versions.push(structureVersion);
            } else if (data.currentStructure && Array.isArray(data.currentStructure)) {
                // Handle currentStructure field as fallback (from 'last' or 'all' scope exports)
                const structureVersion: Version = {
                    id: `ver_${Date.now()}_import`,
                    promptId: data.prompt.id,
                    createdAt: data.exportedAt || new Date().toISOString(),
                    structure: data.currentStructure,
                    isAutoSave: false
                };
                versions.push(structureVersion);
            }
        }
    }

    // Detect conflicts
    const conflicts: ImportConflict[] = [];
    
    // Check project conflicts
    projects.forEach(project => {
        const existing = existingProjects.find(p => p.id === project.id);
        if (existing) {
            conflicts.push({
                id: project.id,
                name: project.name,
                type: 'project',
                resolution: 'overwrite'
            });
        }
    });

    // Check prompt conflicts
    prompts.forEach(prompt => {
        const existing = existingPrompts.find(p => p.id === prompt.id);
        if (existing) {
            conflicts.push({
                id: prompt.id,
                name: prompt.name,
                type: 'prompt',
                resolution: 'overwrite'
            });
        }
    });

    // Check version conflicts
    versions.forEach(version => {
        const existing = existingVersions.find(v => v.id === version.id);
        if (existing) {
            conflicts.push({
                id: version.id,
                name: `Version from ${new Date(version.createdAt).toLocaleDateString()}`,
                type: 'version',
                resolution: 'overwrite'
            });
        }
    });

    return {
        type,
        projects,
        prompts,
        versions,
        conflicts
    };
}

export function applyImportResolutions(
    analysis: ImportAnalysis,
    resolutions: ImportConflict[]
): { projects: Project[]; prompts: Prompt[]; versions: Version[] } {
    const resolutionMap = new Map(resolutions.map(r => [r.id, r]));
    
    let projects: Project[] = [];
    let prompts: Prompt[] = [];
    let versions: Version[] = [];

    // Apply project resolutions
    projects = analysis.projects.map(project => {
        const resolution = resolutionMap.get(project.id);
        if (resolution) {
            if (resolution.resolution === 'skip') {
                return null;
            } else if (resolution.resolution === 'duplicate') {
                return { ...project, id: `proj_${Date.now()}_${project.id}` };
            }
        }
        return project;
    }).filter(Boolean) as Project[];

    // Apply prompt resolutions
    prompts = analysis.prompts.map(prompt => {
        const resolution = resolutionMap.get(prompt.id);
        if (resolution) {
            if (resolution.resolution === 'skip') {
                return null;
            } else if (resolution.resolution === 'duplicate') {
                // Generate new ID and create duplicated versions
                const timestamp = Date.now();
                const newId = `prompt_${timestamp}_${prompt.id}`;
                const associatedVersions = analysis.versions.filter(v => v.promptId === prompt.id);
                let versionIndex = 0;
                associatedVersions.forEach(v => {
                    const versionRes = resolutionMap.get(v.id);
                    if (versionRes && versionRes.resolution !== 'skip') {
                        // Create new version with new ID for duplicated prompt
                        const newVersionId = `ver_${timestamp}_${versionIndex}_${v.id}`;
                        versions.push({ ...v, id: newVersionId, promptId: newId });
                        versionIndex++;
                    }
                });
                // Return duplicated prompt (original prompt will be processed separately)
                return { ...prompt, id: newId };
            }
        }
        return prompt;
    }).filter(Boolean) as Prompt[];

    // Apply version resolutions
    // Note: When a prompt is duplicated, we create new versions for it above.
    // The original versions should still be added for the original prompt.
    analysis.versions.forEach(version => {
        const resolution = resolutionMap.get(version.id);
        if (resolution && resolution.resolution === 'skip') {
            return; // Skip this version
        }
        
        // Check if this version was already added (e.g., during duplication)
        const alreadyAdded = versions.some(v => v.id === version.id);
        if (!alreadyAdded) {
            if (resolution && resolution.resolution === 'duplicate') {
                // Create a duplicate version with new ID
                versions.push({ ...version, id: `ver_${Date.now()}_${version.id}` });
            } else {
                // Add the original version (for original prompt)
                versions.push(version);
            }
        }
    });

    // Update prompt metadata: set versions array and currentVersion
    // This ensures prompts reference their imported versions correctly
    prompts = prompts.map(prompt => {
        // Find all versions for this prompt
        const promptVersions = versions.filter(v => v.promptId === prompt.id);
        
        if (promptVersions.length > 0) {
            // Sort versions by creation date (most recent first)
            const sortedVersions = [...promptVersions].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            // Get version IDs, excluding autosaves for the versions array
            const versionIds = promptVersions
                .filter(v => !v.isAutoSave)
                .map(v => v.id);
            
            // Set currentVersion to the most recent non-autosave version, or the most recent if all are autosaves
            const currentVersion = sortedVersions.find(v => !v.isAutoSave)?.id || sortedVersions[0]?.id || '';
            
            return {
                ...prompt,
                versions: versionIds.length > 0 ? versionIds : [currentVersion].filter(Boolean),
                currentVersion: currentVersion || prompt.currentVersion || ''
            };
        }
        
        // If no versions found, keep prompt as-is but ensure versions array exists
        return {
            ...prompt,
            versions: prompt.versions || [],
            currentVersion: prompt.currentVersion || ''
        };
    });

    return { projects, prompts, versions };
}

export function detectConflicts<T extends { id: string; name?: string }>(
    importItems: T[],
    existingItems: T[]
): ImportConflict[] {
    return importItems
        .filter(importItem => existingItems.some(existing => existing.id === importItem.id))
        .map(item => ({
            id: item.id,
            name: item.name || item.id,
            type: 'prompt' as const, // This would need to be passed as parameter
            resolution: 'overwrite' as const
        }));
}

