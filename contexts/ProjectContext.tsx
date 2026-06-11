import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextValue {
  currentProjectId: string | null;
  currentProjectTitle: string | null;
  setCurrentProject: (id: string, title: string) => void;
  clearCurrentProject: () => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps): React.ReactElement {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string | null>(null);

  const setCurrentProject = (id: string, title: string) => {
    console.log('[ProjectContext] プロジェクトを設定:', { id, title });
    setCurrentProjectId(id);
    setCurrentProjectTitle(title);
  };

  const clearCurrentProject = () => {
    console.log('[ProjectContext] プロジェクトをクリア');
    setCurrentProjectId(null);
    setCurrentProjectTitle(null);
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProjectId,
        currentProjectTitle,
        setCurrentProject,
        clearCurrentProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
