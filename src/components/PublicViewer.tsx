import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import BarChartExtension from './extensions/BarChartExtension';
import CodeBlockExtension from './extensions/CodeBlockExtension';
import { database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Project } from '../types';
import MindmapGraph from './MindmapGraph';
import { parseMarkdownHeadings } from '../utils/markdownParser';

// Reuse CustomTable from Editor (or extract to separate file, but duplicating for speed here)
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

export default function PublicViewer() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const checkPassword = () => {
    if (project?.password && enteredPassword === project.password) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    const projectRef = ref(database, `projects/${projectId}`);
    const unsubscribe = onValue(projectRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.isPublicView || data.isPublicEdit) {
          setProject(data);
        } else {
          setError("Этот проект приватный.");
        }
      } else {
        setError("Проект не найден.");
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Ошибка доступа или проект не существует.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image,
      CustomTable.configure({ resizable: false }), // No resizing in view mode
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
      BarChartExtension, // Charts will be interactive (hover) but not editable
      CodeBlockExtension,
    ],
    content: project?.content || '',
    editable: false, // Read-only
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  }, [project]);

  // Update content when project loads
  useEffect(() => {
    if (editor && project) {
      if (isAuthenticated || !project.password) {
        const currentMarkdown = (editor.storage as any)?.markdown?.getMarkdown?.();
        if (currentMarkdown !== project.content) {
          editor.commands.setContent(project.content);
        }
      }
    }
  }, [project, editor, isAuthenticated]);

  const headingTree = useMemo(() => {
    if (!project) return null;
    if (project.password && !isAuthenticated) return null;
    const tree = parseMarkdownHeadings(project.content);
    tree.text = project.title || 'Untitled';
    return tree;
  }, [project, isAuthenticated]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Загрузка...</div>;
  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center">{error}</div>;
  if (!project) return null;

  // Password Challenge Screen
  if (project.password && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-orange-500/10 text-orange-400 rounded-full">
              <Lock size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Проект защищен паролем</h2>
              <p className="text-zinc-500 text-sm">Пожалуйста, введите пароль для доступа к этому блокноту.</p>
            </div>

            <div className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Пароль..."
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkPassword()}
                  className={`w-full bg-zinc-950 border ${passwordError ? 'border-red-500' : 'border-zinc-800'} rounded-xl px-4 py-3 text-center text-lg outline-none focus:border-orange-500/50 transition-all`}
                  autoFocus
                />
                {passwordError && (
                  <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">Неверный пароль. Попробуйте еще раз.</p>
                )}
              </div>
              <button
                onClick={checkPassword}
                className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Войти
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-white flex flex-col">
      <div className={`flex-1 ${project.publicShowMindmap ? 'flex flex-col md:flex-row' : 'max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 w-full'}`}>

        {/* Content Area */}
        <div className={`${project.publicShowMindmap ? 'w-full md:w-1/2 md:border-r border-white/10 h-[50vh] md:h-screen overflow-y-auto px-4 md:px-8 py-8 md:py-16' : ''}`}>
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">{project.title}</h1>
            <div className="text-sm text-zinc-500">
              {new Date(project.lastModified).toLocaleDateString()}
            </div>
          </header>

          <article className="prose prose-lg prose-invert max-w-none">
            <EditorContent editor={editor} />
          </article>

          <footer className="mt-20 pt-8 border-t border-white/10 text-center text-zinc-600 text-sm">
            Powered by NotionT
          </footer>
        </div>

        {/* Mindmap Area */}
        {project.publicShowMindmap && headingTree && (
          <div className="w-full md:w-1/2 h-[50vh] md:h-screen border-t md:border-t-0 border-white/10">
            <MindmapGraph
              data={headingTree}
              onNodeClick={(lineIndex) => {
                // Scroll to element logic could be added here if needed, 
                // but requires editor ref access or DOM manipulation
              }}
              readOnly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
