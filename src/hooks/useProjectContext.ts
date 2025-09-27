import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProject } from './useProject';

interface ProjectContextData {
  projectId: string;
  projectPath: string; // Store the full project path (e.g., /project/123/files)
  projectName?: string;
  projectAddress?: string;
  timestamp: number;
}

const PROJECT_CONTEXT_KEY = 'lastVisitedProject';

export const useProjectContext = () => {
  const [projectContext, setProjectContext] = useState<ProjectContextData | null>(null);
  const location = useLocation();

  // Auto-track current project from URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'project' && pathParts[2]) {
      const currentProjectId = pathParts[2];
      
      // Store this project path as the last visited
      const contextData: ProjectContextData = {
        projectId: currentProjectId,
        projectPath: location.pathname, // Store the full path
        timestamp: Date.now()
      };
      
      localStorage.setItem(PROJECT_CONTEXT_KEY, JSON.stringify(contextData));
      setProjectContext(contextData);
    }
  }, [location.pathname]);

  // Load project context on mount
  useEffect(() => {
    const stored = localStorage.getItem(PROJECT_CONTEXT_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as ProjectContextData;
        setProjectContext(data);
      } catch (error) {
        console.error('Error parsing stored project context:', error);
        localStorage.removeItem(PROJECT_CONTEXT_KEY);
      }
    }
  }, []);

  const clearProjectContext = () => {
    localStorage.removeItem(PROJECT_CONTEXT_KEY);
    setProjectContext(null);
  };

  const goBackToProject = () => {
    if (projectContext?.projectPath) {
      window.location.href = projectContext.projectPath;
    }
  };

  return {
    projectContext,
    clearProjectContext,
    goBackToProject,
    hasProjectContext: !!projectContext?.projectId
  };
};

export const useProjectContextWithData = () => {
  const { projectContext, clearProjectContext, goBackToProject, hasProjectContext } = useProjectContext();
  const { data: project, isLoading } = useProject(projectContext?.projectId || '');

  return {
    projectContext: projectContext ? {
      ...projectContext,
      projectName: project?.address || `Project ${projectContext.projectId.slice(0, 8)}`,
      projectAddress: project?.address
    } : null,
    clearProjectContext,
    goBackToProject,
    hasProjectContext,
    isLoading
  };
};