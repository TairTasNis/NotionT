import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, Bold, Italic, Underline, Heading1, Heading2, Heading3, LayoutPanelLeft, FileText, Network, Image as ImageIcon, Table as TableIcon, Eye, EyeOff, Plus, Trash2, Columns, Rows, ArrowRight, ArrowDown, Lock, Unlock, Maximize, BarChart as BarChartIcon, Code as CodeIcon, Languages, Share2 } from 'lucide-react';
import { Project, ProjectType } from '../types';
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
import BarChartExtension from './extensions/BarChartExtension';
import CodeBlockExtension from './extensions/CodeBlockExtension';
import TranslatorModal from './TranslatorModal';
import ShareModal from './ShareModal';
import { uploadImageToImgBB } from '../services/imgbb';

// ... CustomTable definition ...

interface EditorProps {
  project: Project;
  onBack: () => void;
  onSave: (project: Project) => void;
}

export default function Editor({ project, onBack, onSave }: EditorProps) {
  const [content, setContent] = useState(project.content);
  const [title, setTitle] = useState(project.title);
  const [viewMode, setViewMode] = useState<ProjectType>(project.type);
  const [tableModal, setTableModal] = useState<{ isOpen: boolean; rows: number; cols: number }>({ isOpen: false, rows: 3, cols: 3 });
  const [translatorModal, setTranslatorModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editorStateToken, setEditorStateToken] = useState(0); // Force re-render for toolbar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... headingTree useMemo ...

  // ... editor definition ...

  // ... useEffect for content sync ...

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

  // ... handleImageUpload ...

  // ... table handlers ...

  // ... handleNodeClick ...

  // ... handleNodeAdd ...

  // ... handleNodeDelete ...

  if (!editor) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload}
      />

      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-950 shrink-0 z-20">
        <div className="flex items-center gap-4">
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
            className="bg-transparent border-none outline-none font-medium text-sm w-64 placeholder-zinc-600"
            placeholder="Без названия"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
          {/* ... existing toolbar buttons ... */}
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
             onClick={() => setShareModalOpen(true)}
             className="p-1.5 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors mr-2"
             title="Поделиться"
           >
             <Share2 size={16} />
           </button>
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
             className={`p-1.5 rounded transition-colors ${viewMode === 'both' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
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
      </header>

      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'text' || viewMode === 'both') && (
          <div className={`h-full flex flex-col ${viewMode === 'both' ? 'w-1/2 border-r border-white/10' : 'w-full max-w-3xl mx-auto'} overflow-y-auto`}>
            <EditorContent editor={editor} className="h-full" />
          </div>
        )}

        {(viewMode === 'mindmap' || viewMode === 'both') && (
          <div className={`h-full ${viewMode === 'both' ? 'w-1/2' : 'w-full'}`}>
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

      <ShareModal 
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        project={project}
        onUpdateProject={handleUpdateProject}
      />
    </div>
  );
}
