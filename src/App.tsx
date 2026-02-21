import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import PublicViewer from './components/PublicViewer';
import { Project, ProjectType } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { database, auth as firebaseAuth } from './lib/firebase';
import { ref, onValue, set, push, remove, query, orderByChild, equalTo, update } from 'firebase/database';

function DashboardWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;

    const projectsRef = query(ref(database, 'projects'), orderByChild('ownerId'), equalTo(user.uid));
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const projectList = Object.values(data) as Project[];
        projectList.sort((a, b) => b.lastModified - a.lastModified);
        setProjects(projectList);
      } else {
        setProjects([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateProject = async (type: ProjectType, title: string) => {
    if (!user) return;

    const newProjectId = push(ref(database, 'projects')).key;
    if (!newProjectId) return;

    const newProject: Project = {
      id: newProjectId,
      title: title,
      type: type,
      content: type === 'mindmap' ? '# Root' : '',
      lastModified: Date.now(),
      ownerId: user.uid
    };

    try {
      await set(ref(database, `projects/${newProjectId}`), newProject);
      navigate(`/project/${newProjectId}`);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await remove(ref(database, `project_versions/${id}`));
      await remove(ref(database, `projects/${id}`));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Ошибка удаления проекта.");
    }
  };

  const handleRenameProject = async (id: string, newTitle: string) => {
    try {
      await update(ref(database, `projects/${id}`), {
        title: newTitle,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error("Error renaming project:", error);
      alert("Ошибка переименования проекта.");
    }
  };

  return (
    <Dashboard
      onCreateProject={handleCreateProject}
      projects={projects}
      onOpenProject={(id) => navigate(`/project/${id}`)}
      onDeleteProject={handleDeleteProject}
      onRenameProject={handleRenameProject}
    />
  );
}

function EditorWrapper() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const projectRef = ref(database, `projects/${projectId}`);
    const unsubscribe = onValue(projectRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.ownerId === user.uid || data.isPublicEdit) {
          setProject(data);
        } else {
          setError('Нет доступа к редактированию.');
        }
      } else {
        setError('Проект не найден.');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Ошибка загрузки.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleSaveProject = useCallback(async (updatedProject: Project) => {
    try {
      await set(ref(database, `projects/${updatedProject.id}`), updatedProject);
    } catch (error) {
      console.error("Error saving project:", error);
    }
  }, []);

  const handleSaveVersion = useCallback(async (content: string, title: string) => {
    if (!project) return;
    const versionId = crypto.randomUUID();
    const timestamp = Date.now();
    const version = {
      id: versionId,
      projectId: project.id,
      content: content,
      title: title,
      timestamp: timestamp,
    };
    try {
      await set(ref(database, `project_versions/${project.id}/${versionId}`), version);
      await update(ref(database, `projects/${project.id}`), {
        content,
        title,
        lastModified: timestamp
      });
      alert("Версия сохранена!");
    } catch (error) {
      console.error("Error saving version:", error);
    }
  }, [project]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Загрузка...</div>;
  if (!user) return <Login />;
  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center">{error} <button onClick={() => navigate('/')} className="ml-4 underline">На главную</button></div>;
  if (!project) return null;

  return (
    <Editor
      project={project}
      onBack={() => navigate('/')}
      onSave={handleSaveProject}
      onSaveVersion={handleSaveVersion}
    />
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Login />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardWrapper /></ProtectedRoute>} />
          <Route path="/project/:projectId" element={<EditorWrapper />} />
          <Route path="/view/:projectId" element={<PublicViewer />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
