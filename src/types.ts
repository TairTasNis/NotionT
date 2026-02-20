export type ProjectType = 'text' | 'mindmap' | 'both';

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  content: string;
  lastModified: number;
  ownerId?: string;
  isPublicView?: boolean;
  isPublicEdit?: boolean;
}
