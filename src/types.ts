export type ProjectType = 'text' | 'mindmap' | 'both';

export interface ProjectVersion {
  id: string;
  projectId: string;
  content: string;
  title: string;
  timestamp: number;
}

export interface Folder {
  id: string;
  title: string;
  ownerId: string;
  createdAt: number;
  password?: string;
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  content: string;
  lastModified: number;
  lastModifiedBy?: string;
  senderId?: string;
  ownerId?: string;
  isPublicView?: boolean;
  isPublicEdit?: boolean;
  publicShowMindmap?: boolean;
  publicShowAuthor?: boolean;
  authorFirstName?: string;
  authorLastName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  password?: string;
  folderId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  createdAt: number;
  linkedGoogle?: boolean;
  avatarUrl?: string;
}
