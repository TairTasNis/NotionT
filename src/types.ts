export type ProjectType = 'text' | 'mindmap' | 'both';

export interface ProjectVersion {
  id: string;
  projectId: string;
  content: string;
  title: string;
  timestamp: number;
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  content: string;
  lastModified: number;
  ownerId?: string;
  isPublicView?: boolean;
  isPublicEdit?: boolean;
  publicShowMindmap?: boolean;
}
