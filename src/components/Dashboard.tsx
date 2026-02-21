import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Network, SplitSquareHorizontal, Plus, LogOut, Trash2, Edit2, Check, X } from 'lucide-react';
import { ProjectType, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onCreateProject: (type: ProjectType, title: string) => void;
  projects: Project[];
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
}

export default function Dashboard({ onCreateProject, projects, onOpenProject, onDeleteProject, onRenameProject }: DashboardProps) {
  const { user, logout } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Create Project Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('both');

  const handleCreateClick = (type: ProjectType) => {
    setNewProjectType(type);
    setNewProjectTitle('');
    setCreateModalOpen(true);
  };

  const confirmCreate = () => {
    if (!newProjectTitle.trim()) return;
    onCreateProject(newProjectType, newProjectTitle.trim());
    setCreateModalOpen(false);
  };

  const handleStartEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditTitle(project.title);
  };

  const handleSaveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameProject(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProjectToDelete(id);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
           <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Проекты</h1>
              <p className="text-zinc-400">Управляйте своими идеями и заметками.</p>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-right">
                  <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white leading-tight">{user?.displayName}</p>
                      <p className="text-xs text-zinc-500">{user?.email}</p>
                  </div>
                  {user?.photoURL && (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                    />
                  )}
              </div>
              <button 
                onClick={logout} 
                className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800" 
                title="Выйти"
              >
                  <LogOut size={20} />
              </button>
           </div>
        </header>

        <div className="flex justify-end mb-8">
          <button
            onClick={() => handleCreateClick('both')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium text-sm shadow-lg shadow-white/5"
          >
            <Plus size={18} />
            <span>Новый проект</span>
          </button>
        </div>

        {projects.length > 0 ? (
          <section>
            <div className="grid grid-cols-1 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900 hover:border-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-400 group-hover:text-white transition-colors">
                      {project.type === 'text' && <FileText size={18} />}
                      {project.type === 'both' && <SplitSquareHorizontal size={18} />}
                      {project.type === 'mindmap' && <Network size={18} />}
                    </div>
                    <div>
                      {editingId === project.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(e as any, project.id);
                              if (e.key === 'Escape') handleCancelEdit(e as any);
                            }}
                          />
                          <button onClick={(e) => handleSaveEdit(e, project.id)} className="p-1 text-green-400 hover:text-green-300">
                            <Check size={16} />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 text-zinc-500 hover:text-white">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors">{project.title || 'Без названия'}</h4>
                          <p className="text-xs text-zinc-500">
                            Изменено {new Date(project.lastModified).toLocaleDateString()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartEdit(e, project)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      title="Переименовать"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, project.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-20 text-zinc-500">
            <p>У вас пока нет проектов. Создайте первый!</p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => setCreateModalOpen(false)}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-[400px] shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4 text-white">Создать новый проект</h3>
            
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Название проекта</label>
              <input 
                type="text" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                placeholder="Мой новый проект"
                value={newProjectTitle}
                onChange={e => setNewProjectTitle(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmCreate()}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setCreateModalOpen(false)} 
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={confirmCreate} 
                className="px-3 py-1.5 text-sm bg-white text-black hover:bg-zinc-200 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newProjectTitle.trim()}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => setProjectToDelete(null)}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-[400px] shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-2 text-white">Удаление проекта</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.
            </p>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setProjectToDelete(null)} 
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
