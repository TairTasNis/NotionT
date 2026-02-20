import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
          if (editor.storage.markdown.getMarkdown() !== project.content) {
              editor.commands.setContent(project.content);
          }
      }
  }, [project, editor]);

  if (loading) return <div className="min-h-screen bg-white text-black flex items-center justify-center">Загрузка...</div>;
  if (error) return <div className="min-h-screen bg-white text-black flex items-center justify-center">{error}</div>;
  if (!project) return null;

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-blue-100 selection:text-black">
      <div className="max-w-3xl mx-auto px-8 py-16">
        <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-gray-900">{project.title}</h1>
            <div className="text-sm text-gray-500">
                {new Date(project.lastModified).toLocaleDateString()}
            </div>
        </header>
        
        <article className="prose prose-lg prose-slate max-w-none">
            <EditorContent editor={editor} />
        </article>

        <footer className="mt-20 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
            Powered by NotionT
        </footer>
      </div>
    </div>
  );
}
