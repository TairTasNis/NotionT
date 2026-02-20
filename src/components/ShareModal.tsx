import React, { useState } from 'react';
import { X, Globe, PenTool, Copy, Check, Save, Network } from 'lucide-react';
import { Project } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  onSaveVersion?: () => void;
}

export default function ShareModal({ isOpen, onClose, project, onUpdateProject, onSaveVersion }: ShareModalProps) {
  const [copiedView, setCopiedView] = useState(false);
  const [copiedEdit, setCopiedEdit] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin + window.location.pathname + '#';
  const viewLink = `${baseUrl}/view/${project.id}`;
  const editLink = `${baseUrl}/project/${project.id}`;

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[500px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-lg font-semibold text-white">Публикация и Доступ</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Save Version */}
          {onSaveVersion && (
            <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-white/5">
              <div>
                <h4 className="font-medium text-white">Сохранить версию</h4>
                <p className="text-xs text-zinc-500">Создать точку восстановления в истории</p>
              </div>
              <button 
                onClick={onSaveVersion}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
              >
                <Save size={16} />
                Сохранить
              </button>
            </div>
          )}

          <div className="h-px bg-zinc-800" />

          {/* View Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-white">Публикация (Просмотр)</h4>
                  <p className="text-xs text-zinc-500">Доступно по ссылке для чтения</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={project.isPublicView || false}
                  onChange={(e) => onUpdateProject({ isPublicView: e.target.checked })}
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {project.isPublicView && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={viewLink} 
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none"
                  />
                  <button 
                    onClick={() => copyToClipboard(viewLink, setCopiedView)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    {copiedView ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                
                {/* Mindmap Toggle */}
                <div className="flex items-center gap-2 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={project.publicShowMindmap || false}
                        onChange={(e) => onUpdateProject({ publicShowMindmap: e.target.checked })}
                      />
                      <div className="w-4 h-4 border border-zinc-600 rounded bg-zinc-900 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors flex items-center justify-center">
                        <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                      <Network size={14} />
                      Показывать Mindmap на сайте
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Edit Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                  <PenTool size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-white">Совместное редактирование</h4>
                  <p className="text-xs text-zinc-500">Доступно по ссылке для изменения</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={project.isPublicEdit || false}
                  onChange={(e) => onUpdateProject({ isPublicEdit: e.target.checked })}
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {project.isPublicEdit && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  readOnly 
                  value={editLink} 
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(editLink, setCopiedEdit)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  {copiedEdit ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
