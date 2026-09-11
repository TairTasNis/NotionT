import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Network, SplitSquareHorizontal, Plus, LogOut, Trash2, Edit2, Check, X, Settings, Folder as FolderIcon, ChevronRight, Lock, Unlock, FolderPlus, FolderOpen, MoreVertical, CornerUpLeft, Camera, Loader2 } from 'lucide-react';
import { ProjectType, Project, Folder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SettingsModal from './SettingsModal';
import { uploadImageToImgBB } from '../services/imgbb';
import { database } from '../lib/firebase';
import { ref, update } from 'firebase/database';

interface DashboardProps {
  onCreateProject: (type: ProjectType, title: string, folderId: string | null) => void;
  projects: Project[];
  folders: Folder[];
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  onCreateFolder: (title: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, newTitle: string) => void;
  onMoveProject: (projectId: string, folderId: string | null) => void;
  onSetProjectPassword: (projectId: string, password?: string) => void;
  onSetFolderPassword: (folderId: string, password?: string) => void;
}

export default function Dashboard({
  onCreateProject, projects, folders, onOpenProject, onDeleteProject, onRenameProject,
  onCreateFolder, onDeleteFolder, onRenameFolder, onMoveProject, onSetProjectPassword, onSetFolderPassword
}: DashboardProps) {
  const { user, userProfile, logout, updateAvatar } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const currentAvatar = userProfile?.avatarUrl || user?.photoURL || '';

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      await updateAvatar(url);
      // Синхронизируем аватар во всех опубликованных статьях с показом автора
      const updates: Promise<void>[] = [];
      for (const p of projects) {
        if (p.publicShowAuthor) {
          updates.push(update(ref(database, `projects/${p.id}`), { authorAvatar: url }));
        }
      }
      await Promise.all(updates);
    } catch (err) {
      console.error('Avatar upload failed', err);
      alert('Не удалось загрузить фото. Попробуйте другое.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Edit / Delete states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editingType, setEditingType] = useState<'project' | 'folder' | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'folder' } | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'project' | 'folder'>('project');
  const [newTitle, setNewTitle] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('both');

  // Password Modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string, type: 'project' | 'folder', hasPassword: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const [authChallengeOpen, setAuthChallengeOpen] = useState(false);
  const [authTarget, setAuthTarget] = useState<{ id: string, type: 'project' | 'folder', expected: string } | null>(null);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Move Modal
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetProject, setMoveTargetProject] = useState<string | null>(null);

  // Context Menu for Items
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [createProjectMenuOpen, setCreateProjectMenuOpen] = useState(false);

  // Derived Data
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const currentItems = useMemo(() => {
    return {
      folders: currentFolderId ? [] : folders,
      projects: projects.filter(p => (p.folderId || null) === currentFolderId)
    };
  }, [projects, folders, currentFolderId]);

  // Click outside to close menu
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setCreateProjectMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Handlers
  const handleItemClick = (e: React.MouseEvent, type: 'project' | 'folder', item: Project | Folder) => {
    e.stopPropagation();
    setActiveMenuId(null);

    if (editingId === item.id) return; // Don't click through if editing

    if (item.password) {
      setAuthTarget({ id: item.id, type, expected: item.password });
      setAuthInput('');
      setAuthError(false);
      setAuthChallengeOpen(true);
      return;
    }

    if (type === 'folder') {
      setCurrentFolderId(item.id);
    } else {
      onOpenProject(item.id);
    }
  };

  const handleAuthSubmit = () => {
    if (!authTarget) return;
    if (authInput === authTarget.expected) {
      setAuthChallengeOpen(false);
      setAuthInput('');
      if (authTarget.type === 'folder') {
        setCurrentFolderId(authTarget.id);
      } else {
        onOpenProject(authTarget.id);
      }
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const openCreateModal = (type: 'project' | 'folder', projType: ProjectType = 'both') => {
    setCreateType(type);
    setNewProjectType(projType);
    setNewTitle('');
    setCreateModalOpen(true);
    setActiveMenuId(null);
  };

  const confirmCreate = () => {
    if (!newTitle.trim()) return;
    if (createType === 'folder') {
      onCreateFolder(newTitle.trim());
    } else {
      onCreateProject(newProjectType, newTitle.trim(), currentFolderId);
    }
    setCreateModalOpen(false);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'folder') onDeleteFolder(itemToDelete.id);
      else onDeleteProject(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleSaveEdit = (e: React.MouseEvent | React.KeyboardEvent, id: string, type: 'project' | 'folder') => {
    e.stopPropagation();
    if (editTitle.trim()) {
      if (type === 'folder') onRenameFolder(id, editTitle.trim());
      else onRenameProject(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const openPasswordModal = (e: React.MouseEvent, id: string, type: 'project' | 'folder', hasPassword: boolean) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setPasswordTarget({ id, type, hasPassword });
    setPasswordInput('');
    setPasswordModalOpen(true);
  };

  const handleSetPassword = () => {
    if (!passwordTarget) return;
    if (passwordTarget.type === 'folder') {
      onSetFolderPassword(passwordTarget.id, passwordInput || undefined);
    } else {
      onSetProjectPassword(passwordTarget.id, passwordInput || undefined);
    }
    setPasswordModalOpen(false);
  };

  const handleRemovePassword = () => {
    if (!passwordTarget) return;
    if (passwordTarget.type === 'folder') onSetFolderPassword(passwordTarget.id, undefined);
    else onSetProjectPassword(passwordTarget.id, undefined);
    setPasswordModalOpen(false);
  };

  const openMoveModal = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setMoveTargetProject(projectId);
    setMoveModalOpen(true);
  };

  const handleMove = (folderId: string | null) => {
    if (!moveTargetProject) return;
    onMoveProject(moveTargetProject, folderId);
    setMoveModalOpen(false);
    setMoveTargetProject(null);
  };

  // Render Helpers
  const renderItem = (item: Project | Folder, type: 'project' | 'folder') => {
    const isEditing = editingId === item.id;
    const isProject = type === 'project';
    const hasPassword = !!item.password;

    return (
      <div
        key={item.id}
        onClick={(e) => handleItemClick(e, type, item)}
        className="group relative flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900 hover:border-white/10 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-zinc-950 text-zinc-400 group-hover:text-white transition-colors shrink-0">
            {type === 'folder' ? (
              <FolderIcon size={20} className="fill-zinc-800/50" />
            ) : (
              <>
                {(item as Project).type === 'text' && <FileText size={18} />}
                {(item as Project).type === 'both' && <SplitSquareHorizontal size={18} />}
                {(item as Project).type === 'mindmap' && <Network size={18} />}
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(e, item.id, type);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button onClick={(e) => handleSaveEdit(e, item.id, type)} className="p-1 text-green-400 hover:text-green-300 shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-zinc-500 hover:text-white shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                  {item.title || 'Без названия'}
                </h4>
                {hasPassword && <Lock size={12} className="text-orange-400 shrink-0" />}
              </div>
            )}
            {!isEditing && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {type === 'folder'
                  ? `${projects.filter(p => p.folderId === item.id).length} проектов`
                  : `Изменено ${new Date((item as Project).lastModified).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === item.id ? null : item.id);
            }}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={18} />
          </button>

          <AnimatePresence>
            {activeMenuId === item.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(item.id);
                    setEditTitle(item.title);
                    setEditingType(type);
                    setActiveMenuId(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Edit2 size={14} /> Переименовать
                </button>

                {isProject && (
                  <button
                    onClick={(e) => openMoveModal(e, item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <CornerUpLeft size={14} /> Переместить
                  </button>
                )}

                <button
                  onClick={(e) => openPasswordModal(e, item.id, type, hasPassword)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  {hasPassword ? <Unlock size={14} /> : <Lock size={14} />}
                  {hasPassword ? 'Снять пароль' : 'Установить пароль'}
                </button>

                <div className="h-px bg-zinc-800 my-1 font-sans" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete({ id: item.id, type });
                    setActiveMenuId(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Удалить
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 py-4 z-40">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Проекты</h1>
            <p className="text-zinc-400">Управляйте своими идеями и заметками.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-right">
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : user?.displayName}</p>
                <p className="text-xs text-zinc-500">@{userProfile?.username || user?.email}</p>
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarFile}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-10 h-10 rounded-full group/avatar shrink-0"
                title="Сменить фото"
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={user?.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm font-medium">
                    {userProfile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                  {avatarUploading ? (
                    <Loader2 size={16} className="text-white animate-spin" />
                  ) : (
                    <Camera size={16} className="text-white" />
                  )}
                </span>
              </button>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800"
              title="Настройки"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800"
              title="Выйти"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Toolbar & Breadcrumbs */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-lg font-medium">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`hover:text-white transition-colors ${!currentFolderId ? 'text-white' : 'text-zinc-500'}`}
            >
              Мои проекты
            </button>
            {currentFolderId && currentFolder && (
              <>
                <ChevronRight size={16} className="text-zinc-600" />
                <span className="text-white flex items-center gap-2">
                  <FolderOpen size={18} className="text-blue-400" />
                  {currentFolder.title}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!currentFolderId && (
              <button
                onClick={() => openCreateModal('folder')}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors font-medium text-sm border border-zinc-800"
              >
                <FolderPlus size={16} />
                <span>Новая папка</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateProjectMenuOpen(!createProjectMenuOpen);
                  setActiveMenuId(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium text-sm shadow-lg shadow-white/5"
              >
                <Plus size={16} />
                <span>Новый проект</span>
              </button>

              <AnimatePresence>
                {createProjectMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50"
                  >
                    <button onClick={() => { openCreateModal('project', 'both'); setCreateProjectMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
                      <SplitSquareHorizontal size={14} /> Текст + Mindmap
                    </button>
                    <button onClick={() => { openCreateModal('project', 'text'); setCreateProjectMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
                      <FileText size={14} /> Только текст
                    </button>
                    <button onClick={() => { openCreateModal('project', 'mindmap'); setCreateProjectMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
                      <Network size={14} /> Только Mindmap
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content List */}
        {currentItems.folders.length > 0 || currentItems.projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {/* Render Folders first */}
            {currentItems.folders.map(folder => renderItem(folder, 'folder'))}

            {/* Divider if both exist */}
            {currentItems.folders.length > 0 && currentItems.projects.length > 0 && (
              <div className="h-px bg-zinc-800/50 my-2" />
            )}

            {/* Render Projects */}
            {currentItems.projects.map(project => renderItem(project, 'project'))}
          </div>
        ) : (
          <div className="text-center py-32 text-zinc-500 bg-zinc-900/10 rounded-3xl border border-white/5 border-dashed">
            <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
              {currentFolderId ? <FolderOpen size={24} className="text-zinc-600" /> : <FileText size={24} className="text-zinc-600" />}
            </div>
            <p className="text-lg font-medium text-zinc-300 mb-1">Здесь пока пусто</p>
            <p className="text-sm">Создайте {currentFolderId ? 'свой первый проект' : 'новый проект или папку'}, чтобы начать работу.</p>
          </div>
        )}
      </div>

      {/* -- Modals below -- */}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4 text-white">
              {createType === 'folder' ? 'Создать папку' : 'Создать проект'}
            </h3>
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Название</label>
              <input
                type="text"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder={createType === 'folder' ? "Новая папка" : "Мой проект"}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmCreate()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Отмена</button>
              <button onClick={confirmCreate} disabled={!newTitle.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setItemToDelete(null)}>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-medium mb-2 text-white">Удаление {itemToDelete.type === 'folder' ? 'папки' : 'проекта'}</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              {itemToDelete.type === 'folder'
                ? 'Вы уверены, что хотите удалить эту папку? Все проекты внутри будут перемещены в корень.'
                : 'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Отмена</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalOpen && passwordTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setPasswordModalOpen(false)}>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-2 text-white flex items-center gap-2">
              <Lock size={18} className="text-blue-400" />
              {passwordTarget.hasPassword ? 'Изменить пароль' : 'Установить пароль'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              Пароль будет запрашиваться при попытке открыть {passwordTarget.type === 'folder' ? 'папку' : 'проект'}.
            </p>

            <div className="mb-6">
              <input
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="Новый пароль"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && passwordInput && handleSetPassword()}
              />
            </div>

            <div className="flex justify-between items-center">
              {passwordTarget.hasPassword ? (
                <button onClick={handleRemovePassword} className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors">
                  Снять защиту
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Отмена</button>
                <button onClick={handleSetPassword} disabled={!passwordInput} className="px-4 py-2 text-sm bg-white text-black hover:bg-zinc-200 rounded-xl font-medium transition-colors disabled:opacity-50">
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Challenge Modal */}
      {authChallengeOpen && authTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[90]" onClick={() => setAuthChallengeOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-[400px] shadow-2xl animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">Объект защищен паролем</h2>
            <p className="text-zinc-500 text-sm mb-6">Введите пароль для доступа.</p>

            <div className="relative mb-6">
              <input
                type="password"
                placeholder="Пароль..."
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                className={`w-full bg-zinc-950 border ${authError ? 'border-red-500' : 'border-zinc-800'} rounded-xl px-4 py-3 text-center text-lg outline-none focus:border-orange-500/50 transition-all`}
                autoFocus
              />
              {authError && <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-500">Неверный пароль. У вас нет доступа.</p>}
            </div>
            <button
              onClick={handleAuthSubmit}
              className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              Войти <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {moveModalOpen && moveTargetProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setMoveModalOpen(false)}>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4 text-white">Переместить проект</h3>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-6 pr-2">
              <button
                onClick={() => handleMove(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${projects.find(p => p.id === moveTargetProject)?.folderId === null ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'}`}
              >
                <FolderOpen size={18} className={projects.find(p => p.id === moveTargetProject)?.folderId === null ? 'text-blue-400' : 'text-zinc-500'} />
                <span className="font-medium text-sm">Корень (Мои проекты)</span>
              </button>

              {folders.map(f => {
                const isCurrent = projects.find(p => p.id === moveTargetProject)?.folderId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMove(f.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCurrent ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'}`}
                  >
                    <FolderIcon size={18} className={isCurrent ? 'fill-blue-500/50 text-blue-400' : 'fill-zinc-800/50 text-zinc-500'} />
                    <span className="font-medium text-sm truncate">{f.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setMoveModalOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Отмена</button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
