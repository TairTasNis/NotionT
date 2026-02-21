import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, Bold, Italic, Underline, Heading1, Heading2, Heading3, LayoutPanelLeft, FileText, Network, Image as ImageIcon, Table as TableIcon, Eye, EyeOff, Plus, Trash2, Columns, Rows, ArrowRight, ArrowDown, Lock, Unlock, Maximize, BarChart as BarChartIcon, Code as CodeIcon, Languages, Share2, History, UploadCloud, Edit2, X, Check } from 'lucide-react';
import { Project, ProjectType, ProjectVersion } from '../types';
import { database } from '../lib/firebase';
import { ref, onValue, get, remove, update } from 'firebase/database';
import MindmapGraph from './MindmapGraph';
import { parseMarkdownHeadings } from '../utils/markdownParser';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import BarChartExtension from './extensions/BarChartExtension';
import CodeBlockExtension from './extensions/CodeBlockExtension';
import TranslatorModal from './TranslatorModal';
import ShareModal from './ShareModal';
import { uploadImageToImgBB } from '../services/imgbb';
import { useAuth } from '../contexts/AuthContext';

// Custom Table extension to support layout modes
const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layoutMode: {
        default: 'fixed',
        parseHTML: element => element.getAttribute('data-layout-mode'),
        renderHTML: attributes => {
          return {
            'data-layout-mode': attributes.layoutMode,
            style: attributes.layoutMode === 'fixed' 
              ? 'table-layout: fixed; width: 100%' 
              : 'table-layout: auto; width: auto; min-width: 100%',
          }
        },
      },
    }
  }
});

interface EditorProps {
  project: Project;
  onBack: () => void;
  onSave: (project: Project) => void;
  onSaveVersion?: (content: string, title: string) => void;
}

export default function Editor({ project, onBack, onSave, onSaveVersion }: EditorProps) {
  const { user } = useAuth();
  const [content, setContent] = useState(project.content);
  const [title, setTitle] = useState(project.title);
  const [viewMode, setViewMode] = useState<ProjectType>(project.type);
  const [tableModal, setTableModal] = useState<{ isOpen: boolean; rows: number; cols: number }>({ isOpen: false, rows: 3, cols: 3 });
  const [translatorModal, setTranslatorModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [versionToRestore, setVersionToRestore] = useState<ProjectVersion | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editorStateToken, setEditorStateToken] = useState(0); // Force re-render for toolbar
  const [status, setStatus] = useState('connecting');

  // Collaboration Provider
  const provider = useMemo(() => {
    return new HocuspocusProvider({
      url: `ws://${window.location.host}/collaboration`,
      name: `project-${project.id}`,
      onStatus: (event) => {
        setStatus(event.status);
      },
    });
  }, [project.id]);

  // Cleanup provider on unmount
  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  // Force text mode on mobile
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768 && viewMode === 'both') {
        setViewMode('text');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

  // ...

  const handleDeleteClick = (versionId: string) => {
    setVersionToDelete(versionId);
  };

  const confirmDelete = async () => {
    if (!versionToDelete) return;
    
    try {
      await remove(ref(database, `project_versions/${project.id}/${versionToDelete}`));
      // Update local state
      setVersions(prev => prev.filter(v => v.id !== versionToDelete));
      setVersionToDelete(null);
    } catch (error: any) {
      console.error("Error deleting version:", error);
      alert(`Ошибка удаления версии: ${error.message}`);
    }
  };

  const startRenamingVersion = (version: ProjectVersion) => {
    setEditingVersionId(version.id);
    setEditingTitle(version.title);
  };

  const saveRenamedVersion = async (versionId: string) => {
    try {
      await update(ref(database, `project_versions/${project.id}/${versionId}`), {
        title: editingTitle
      });
      // Update local state
      setVersions(prev => prev.map(v => v.id === versionId ? { ...v, title: editingTitle } : v));
      setEditingVersionId(null);
    } catch (error) {
      console.error("Error renaming version:", error);
      alert("Ошибка переименования версии.");
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveVersionWrapper = () => {
    if (onSaveVersion) {
      onSaveVersion(content, title);
    }
  };

  // Parse headings for mindmap - Memoized to prevent re-renders on every editor transaction
  const headingTree = useMemo(() => {
    const tree = parseMarkdownHeadings(content);
    tree.text = title || 'Untitled';
    return tree;
  }, [content, title]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: false, // Disable default history for collaboration
      }),
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: user?.email || 'Anonymous',
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
        },
      }),
      Image,
      CustomTable.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
      BarChartExtension,
      CodeBlockExtension,
      BubbleMenuExtension.configure({
        pluginKey: 'tableBubbleMenu',
        shouldShow: ({ editor }) => {
          return editor.isActive('table');
        },
      }),
    ],
    content: project.content,
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      setContent(markdown);
    },
    onTransaction: () => {
      setEditorStateToken(prev => prev + 1);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full p-4 md:p-8',
      },
    },
  });

  // Update editor content if project content changes externally (e.g. from mindmap)
  useEffect(() => {
    if (editor && content !== editor.storage.markdown.getMarkdown()) {
       if (Math.abs(content.length - editor.storage.markdown.getMarkdown().length) > 5) {
         editor.commands.setContent(content);
       }
    }
  }, [content, editor]);

  useEffect(() => {
    if (historyModalOpen) {
      const versionsRef = ref(database, `project_versions/${project.id}`);
      get(versionsRef).then((snapshot) => {
        if (snapshot.exists()) {
          const versionsList = Object.values(snapshot.val()) as ProjectVersion[];
          versionsList.sort((a, b) => b.timestamp - a.timestamp);
          setVersions(versionsList);
        } else {
          setVersions([]);
        }
      });
    }
  }, [historyModalOpen, project.id]);

  const handleRestoreClick = (version: ProjectVersion) => {
    setVersionToRestore(version);
  };

  const confirmRestore = () => {
    if (!versionToRestore) return;
    
    const version = versionToRestore;
    console.log("Restoring version content:", version.content);
    
    setContent(version.content);
    setTitle(version.title);
    
    if (editor) {
      editor.commands.setContent(version.content);
    }
    
    setVersionToRestore(null);
    setHistoryModalOpen(false);
    
    // Save immediately
    onSave({
      ...project,
      title: version.title,
      content: version.content,
      lastModified: Date.now(),
    });
    console.log("Version restored and saved.");
  };

  const handleBack = () => {
    onSave({
      ...project,
      title,
      content,
      type: viewMode,
      lastModified: Date.now(),
    });
    onBack();
  };

  const handleUpdateProject = (updates: Partial<Project>) => {
      onSave({ ...project, ...updates });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImageToImgBB(file);
      if (editor) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
      }
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Failed to upload image. Please try again.");
    }

    event.target.value = '';
  };

  const handleTableInsertClick = () => {
    setTableModal({ isOpen: true, rows: 3, cols: 3 });
  };

  const confirmInsertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: tableModal.rows, cols: tableModal.cols, withHeaderRow: true }).run();
    }
    setTableModal({ ...tableModal, isOpen: false });
  };

  const handleNodeClick = useCallback((lineIndex: number) => {
    if (!editor) return;

    const findNodeByLine = (node: any, line: number): any => {
      if (node.line === line) return node;
      for (const child of node.children) {
        const found = findNodeByLine(child, line);
        if (found) return found;
      }
      return null;
    };

    const targetNode = findNodeByLine(headingTree, lineIndex);

    if (targetNode) {
      let foundPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (foundPos !== -1) return false;
        if (node.type.name === 'heading' && node.attrs.level === targetNode.level) {
           if (node.textContent === targetNode.text) {
             foundPos = pos;
             return false;
           }
        }
        return true;
      });

      if (foundPos !== -1) {
        editor.chain().focus().setTextSelection(foundPos).scrollIntoView().run();
      } else {
         editor.chain().focus().run();
      }
    } else {
        editor.chain().focus().run();
    }
  }, [editor, headingTree]);

  const handleNodeAdd = (parentId: string, text: string) => {
    const findNode = (node: any): any => {
      if (node.id === parentId) return node;
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };

    const parentNode = findNode(headingTree);
    if (!parentNode) return;

    const newLevel = parentNode.level + 1;
    const hashes = '#'.repeat(Math.min(newLevel, 6));

    let insertIndex = content.length;
    
    if (parentId !== 'root') {
       const lines = content.split('\n');
       const parentLineIndex = parentNode.line;
       for (let i = parentLineIndex + 1; i < lines.length; i++) {
           const match = lines[i].match(/^(#{1,6})\s/);
           if (match) {
               const level = match[1].length;
               if (level <= parentNode.level) {
                   insertIndex = lines.slice(0, i).join('\n').length + 1;
                   break;
               }
           }
       }
    }

    const before = content.substring(0, insertIndex);
    const after = content.substring(insertIndex);
    const toInsert = (before.endsWith('\n') ? '' : '\n') + `${hashes} ${text}` + (after.startsWith('\n') ? '' : '\n');
    
    const newMarkdown = before + toInsert + after;
    setContent(newMarkdown);
    if (editor) {
        editor.commands.setContent(newMarkdown);
    }
  };

  const handleNodeDelete = (id: string) => {
    const findNode = (node: any): any => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };

    const nodeToDelete = findNode(headingTree);
    if (!nodeToDelete || nodeToDelete.id === 'root') return;

    const lines = content.split('\n');
    const startLine = nodeToDelete.line;
    let endLine = lines.length;

    for (let i = startLine + 1; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s/);
        if (match) {
            const level = match[1].length;
            if (level <= nodeToDelete.level) {
                endLine = i;
                break;
            }
        }
    }

    const newLines = [...lines.slice(0, startLine), ...lines.slice(endLine)];
    const newMarkdown = newLines.join('\n');
    setContent(newMarkdown);
    if (editor) {
        editor.commands.setContent(newMarkdown);
    }
  };

  // Swipe handlers
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Only swipe on mobile
    if (window.innerWidth >= 768) return;

    if (isLeftSwipe && viewMode === 'text') {
      setViewMode('mindmap');
    }
    if (isRightSwipe && viewMode === 'mindmap') {
      setViewMode('text');
    }
  };

  if (!editor) {
    return null;
  }

  // Check for selection to show mobile toolbar
  const hasSelection = editor && !editor.state.selection.empty;

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden relative">
      {/* Mobile Formatting Bar (Fixed at bottom) */}
      {hasSelection && (
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 animate-in slide-in-from-bottom-2 fade-in">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Жирный">
            <Bold size={20} />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Курсив">
            <Italic size={20} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 1">
            <Heading1 size={20} />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 2">
            <Heading2 size={20} />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 3">
            <Heading3 size={20} />
          </button>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload}
      />

      <header className="h-14 border-b border-white/10 flex items-center px-2 md:px-4 bg-zinc-950 shrink-0 z-20 overflow-x-auto gap-2 md:gap-4 [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none outline-none font-medium text-sm w-32 md:w-64 placeholder-zinc-600 hidden md:block"
            placeholder="Без названия"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/5 shrink-0">
          {/* Formatting buttons - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Жирный">
              <Bold size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Курсив">
              <Italic size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 1">
              <Heading1 size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 2">
              <Heading2 size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`} title="Заголовок 3">
              <Heading3 size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
          </div>

          {/* Insert buttons - Always visible */}
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Изображение">
            <ImageIcon size={16} />
          </button>
          <button onClick={handleTableInsertClick} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Таблица">
            <TableIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().insertContent({ type: 'barChart' }).run()} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Столбчатая диаграмма">
            <BarChartIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 hover:bg-zinc-800 rounded ${editor.isActive('codeBlock') ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title="Код">
            <CodeIcon size={16} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={() => {
              const selection = editor.state.selection;
              const text = selection.empty ? '' : editor.state.doc.textBetween(selection.from, selection.to, ' ');
              setTranslatorModal({ isOpen: true, text });
            }} 
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
            title="Переводчик"
          >
            <Languages size={16} />
          </button>
        </div>

        {/* Table Controls (Visible when table is active) */}
        {editor && editor.isActive('table') && (
          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2 absolute left-1/2 -translate-x-1/2 top-14 mt-2 z-30">
             {/* ... table controls ... */}
             <button 
              onClick={() => editor.chain().focus().addColumnBefore().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
              title="Добавить столбец слева"
            >
              <Columns size={16} className="rotate-180" />
            </button>
            <button 
              onClick={() => editor.chain().focus().addColumnAfter().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
              title="Добавить столбец справа"
            >
              <Columns size={16} />
            </button>
            <button 
              onClick={() => editor.chain().focus().deleteColumn().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300" 
              title="Удалить столбец"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => editor.chain().focus().addRowBefore().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
              title="Добавить строку сверху"
            >
              <Rows size={16} className="rotate-180" />
            </button>
            <button 
              onClick={() => editor.chain().focus().addRowAfter().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
              title="Добавить строку снизу"
            >
              <Rows size={16} />
            </button>
            <button 
              onClick={() => editor.chain().focus().deleteRow().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300" 
              title="Удалить строку"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => editor.chain().focus().deleteTable().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300" 
              title="Удалить таблицу"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
             <button 
              onClick={() => {
                const currentMode = editor.getAttributes('table').layoutMode;
                const newMode = currentMode === 'fixed' ? 'auto' : 'fixed';
                editor.chain().focus().updateAttributes('table', { layoutMode: newMode }).run();
              }} 
              className={`p-1.5 rounded hover:bg-zinc-800 ${editor.getAttributes('table').layoutMode === 'fixed' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              title={editor.getAttributes('table').layoutMode === 'fixed' ? "Режим: Фиксированная ширина (Locked)" : "Режим: Авто-ширина (Unlocked)"}
            >
              {editor.getAttributes('table').layoutMode === 'fixed' ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <button 
              onClick={() => editor.chain().focus().fixTables().run()} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" 
              title="Выровнять ширину столбцов"
            >
              <Maximize size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
           <button 
             onClick={() => setHistoryModalOpen(true)}
             className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
             title="История версий"
           >
             <History size={16} />
           </button>
           <button 
             onClick={() => setShareModalOpen(true)}
             className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors ml-2"
             title="Опубликовать"
           >
             <UploadCloud size={16} />
             <span className="hidden md:inline">Опубликовать</span>
           </button>
           
           {/* View Switcher - Hidden on Mobile (use swipe instead) */}
           <div className="hidden md:flex items-center">
             <div className="w-px h-4 bg-white/10 mx-1" />
             <button 
               onClick={() => setViewMode('text')}
               className={`p-1.5 rounded transition-colors ${viewMode === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
               title="Только текст"
             >
               <FileText size={16} />
             </button>
             <button 
               onClick={() => setViewMode('both')}
               className={`hidden md:block p-1.5 rounded transition-colors ${viewMode === 'both' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
               title="Разделенный вид"
             >
               <LayoutPanelLeft size={16} />
             </button>
             <button 
               onClick={() => setViewMode('mindmap')}
               className={`p-1.5 rounded transition-colors ${viewMode === 'mindmap' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
               title="Только Mindmap"
             >
               <Network size={16} />
             </button>
           </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 flex justify-around items-center h-12 z-40">
        <button 
          onClick={() => setViewMode('text')}
          className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'text' ? 'text-white' : 'text-zinc-500'}`}
        >
          <FileText size={18} />
          <span className="text-[10px] mt-0.5">Текст</span>
        </button>
        <button 
          onClick={() => setViewMode('mindmap')}
          className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'mindmap' ? 'text-white' : 'text-zinc-500'}`}
        >
          <Network size={18} />
          <span className="text-[10px] mt-0.5">Mindmap</span>
        </button>
      </div>

      {/* Mobile Mindmap Controls */}
      {viewMode === 'mindmap' && (
        <div className="md:hidden absolute bottom-14 right-4 z-50 flex flex-col gap-2">
          <button 
            onClick={() => {
              // Add child node to selected or root
              handleNodeAdd('root', 'New Node');
            }}
            className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500"
            title="Добавить узел"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      <div 
        className="flex-1 flex overflow-hidden flex-col md:flex-row touch-pan-y pb-12 md:pb-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {(viewMode === 'text' || viewMode === 'both') && (
          <div className={`h-full flex flex-col ${viewMode === 'both' ? 'w-full md:w-1/2 md:border-r border-white/10' : 'w-full max-w-3xl mx-auto'} overflow-y-auto`}>
            <EditorContent editor={editor} className="h-full" />
          </div>
        )}

        {(viewMode === 'mindmap' || viewMode === 'both') && (
          <div className={`h-full ${viewMode === 'both' ? 'hidden md:block md:w-1/2' : 'w-full'}`}>
            <MindmapGraph 
              data={headingTree} 
              onNodeClick={handleNodeClick} 
              readOnly={false}
              onNodeAdd={handleNodeAdd}
              onNodeDelete={handleNodeDelete}
            />
          </div>
        )}
      </div>

      {/* Table Creation Modal */}
      {tableModal.isOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setTableModal({ ...tableModal, isOpen: false })}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-80 shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4 text-white">Вставить таблицу</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Строки</label>
                <input 
                  type="number" 
                  min="1"
                  max="20"
                  className="w-full bg-zinc-950 border border-white/10 rounded p-2 outline-none focus:border-white/30 text-white"
                  value={tableModal.rows}
                  onChange={e => setTableModal({ ...tableModal, rows: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Столбцы</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  className="w-full bg-zinc-950 border border-white/10 rounded p-2 outline-none focus:border-white/30 text-white"
                  value={tableModal.cols}
                  onChange={e => setTableModal({ ...tableModal, cols: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setTableModal({ ...tableModal, isOpen: false })} 
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={confirmInsertTable} 
                className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-zinc-200 font-medium transition-colors"
              >
                Вставить
              </button>
            </div>
          </div>
        </div>
      )}

      <TranslatorModal 
        isOpen={translatorModal.isOpen}
        onClose={() => setTranslatorModal({ ...translatorModal, isOpen: false })}
        initialText={translatorModal.text}
        onReplace={(text) => {
            if (editor) {
                editor.chain().focus().insertContent(text).run();
            }
        }}
      />

      {/* History Modal */}
      {historyModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setHistoryModalOpen(false)}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-[500px] shadow-2xl max-h-[80vh] flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4 text-white flex items-center gap-2">
              <History size={20} />
              История версий
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
              {versions.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Нет сохраненных версий</p>
              ) : (
                versions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-white/5 hover:border-white/20 transition-colors group">
                    <div className="flex-1 mr-4">
                      <div className="font-medium text-sm text-white mb-0.5">{new Date(version.timestamp).toLocaleString()}</div>
                      
                      {editingVersionId === version.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full"
                            autoFocus
                          />
                          <button onClick={() => saveRenamedVersion(version.id)} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                          <button onClick={() => setEditingVersionId(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group-hover:text-white text-zinc-500">
                          <span className="text-xs truncate max-w-[150px]">{version.title}</span>
                          <button onClick={() => startRenamingVersion(version)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity">
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleRestoreClick(version)}
                        className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                      >
                        Восстановить
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(version.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Удалить версию"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button 
                onClick={() => setHistoryModalOpen(false)} 
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {versionToRestore && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => setVersionToRestore(null)}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-[400px] shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-2 text-white">Подтверждение</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Вы уверены, что хотите восстановить версию от <span className="text-white font-medium">{new Date(versionToRestore.timestamp).toLocaleString()}</span>? 
              <br/><br/>
              Текущие несохраненные изменения будут потеряны.
            </p>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setVersionToRestore(null)} 
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={confirmRestore} 
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
              >
                Восстановить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {versionToDelete && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => setVersionToDelete(null)}>
          <div 
            className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-[400px] shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-2 text-white">Удаление версии</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Вы уверены, что хотите удалить эту версию? Это действие нельзя отменить.
            </p>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setVersionToDelete(null)} 
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

      <ShareModal 
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        project={project}
        onUpdateProject={handleUpdateProject}
        onSaveVersion={onSaveVersion ? handleSaveVersionWrapper : undefined}
      />
    </div>
  );
}
