import React from 'react';
import { motion } from 'motion/react';
import { FileText, Network, SplitSquareHorizontal, Plus, LogOut } from 'lucide-react';
import { ProjectType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onCreateProject: (type: ProjectType) => void;
  projects: any[]; // We'll type this properly later if needed
  onOpenProject: (id: string) => void;
}

export default function Dashboard({ onCreateProject, projects, onOpenProject }: DashboardProps) {
  const { user, logout } = useAuth();

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
            onClick={() => onCreateProject('both')}
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
                      <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors">{project.title || 'Без названия'}</h4>
                      <p className="text-xs text-zinc-500">
                        Изменено {new Date(project.lastModified).toLocaleDateString()}
                      </p>
                    </div>
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
    </div>
  );
}
