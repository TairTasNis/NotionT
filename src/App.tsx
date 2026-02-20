import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import PublicViewer from './components/PublicViewer';
import { Project, ProjectType } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { database } from './lib/firebase';
import { ref, onValue, set, push, remove, query, orderByChild, equalTo, get } from 'firebase/database';

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

  const handleCreateProject = async (type: ProjectType) => {
    if (!user) return;
    const newProjectId = crypto.randomUUID();
    const newProject: Project = {
      id: newProjectId,
      title: 'Untitled Project',
      type,
      content: '',
      lastModified: Date.now(),
      ownerId: user.uid,
    };

    try {
      await set(ref(database, `projects/${newProjectId}`), newProject);
      navigate(`/project/${newProjectId}`);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  return (
    <Dashboard 
      onCreateProject={handleCreateProject} 
      projects={projects}
      onOpenProject={(id) => navigate(`/project/${id}`)}
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

    const projectRef = ref(database, `projects/${projectId}`);
    const unsubscribe = onValue(projectRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Check permissions
        if (user && data.ownerId === user.uid) {
             setProject(data);
        } else if (data.isPublicEdit) {
             setProject(data);
        } else {
             setError("Нет доступа к редактированию.");
        }
      } else {
        setError("Проект не найден.");
      }
      setLoading(false);
    }, (err) => {
        console.error(err);
        setError("Ошибка загрузки.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const handleSaveProject = async (updatedProject: Project) => {
    try {
        await set(ref(database, `projects/${updatedProject.id}`), updatedProject);
    } catch (error) {
        console.error("Error saving project:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Загрузка...</div>;
  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center">{error} <button onClick={() => navigate('/')} className="ml-4 underline">На главную</button></div>;
  if (!project) return null;

  return (
    <Editor 
      project={project} 
      onBack={() => navigate('/')}
      onSave={handleSaveProject}
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

