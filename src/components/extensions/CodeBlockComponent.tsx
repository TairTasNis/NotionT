import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Check, Copy, Download, ChevronDown, ChevronUp, Code2 } from 'lucide-react';

const COMMON_LANGUAGES = [
  { value: 'auto', label: 'Auto' },
  { value: 'javascript', label: 'JavaScript (.js)' },
  { value: 'typescript', label: 'TypeScript (.ts)' },
  { value: 'python', label: 'Python (.py)' },
  { value: 'css', label: 'CSS (.css)' },
  { value: 'html', label: 'HTML (.html)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'java', label: 'Java (.java)' },
  { value: 'cpp', label: 'C++ (.cpp)' },
  { value: 'csharp', label: 'C# (.cs)' },
  { value: 'go', label: 'Go (.go)' },
  { value: 'rust', label: 'Rust (.rs)' },
  { value: 'sql', label: 'SQL (.sql)' },
  { value: 'bash', label: 'Bash (.sh)' },
];

const EXTENSION_MAP: Record<string, string> = {
  'javascript': 'js',
  'typescript': 'ts',
  'python': 'py',
  'css': 'css',
  'html': 'html',
  'json': 'json',
  'java': 'java',
  'cpp': 'cpp',
  'csharp': 'cs',
  'go': 'go',
  'rust': 'rs',
  'sql': 'sql',
  'bash': 'sh',
};

export default function CodeBlockComponent(props: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [language, setLanguage] = useState(props.node.attrs.language || 'auto');
  const [customExt, setCustomExt] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-detection logic (simple heuristics)
  useEffect(() => {
    if (language === 'auto' && props.node.textContent) {
      const content = props.node.textContent;
      if (content.includes('import React') || content.includes('useState')) {
        setLanguage('typescript'); // or javascript
      } else if (content.includes('def ') && content.includes(':')) {
        setLanguage('python');
      } else if (content.includes('{') && content.includes('}') && content.includes(':') && !content.includes('const')) {
        setLanguage('css'); // Very basic
      } else if (content.trim().startsWith('<') && content.includes('>')) {
        setLanguage('html');
      }
      // Add more heuristics as needed
    }
  }, [props.node.textContent, language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    if (val !== 'custom') {
        props.updateAttributes({ language: val });
    }
  };

  const handleCustomExtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomExt(val);
    setLanguage(val);
    props.updateAttributes({ language: val });
  };

  const handleCopy = () => {
    const content = props.node.textContent;
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = props.node.textContent;
    const currentLang = props.node.attrs.language || language;
    const ext = EXTENSION_MAP[currentLang] || (currentLang === 'auto' ? 'txt' : currentLang.replace('.', ''));
    const filename = `snippet.${ext}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <NodeViewWrapper className="my-4 relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 select-none" contentEditable={false}>
        <div className="flex items-center gap-3">
          <div className="text-zinc-500">
            <Code2 size={16} />
          </div>
          <div className="flex items-center gap-2">
            <select 
                className="bg-transparent text-xs text-zinc-300 outline-none cursor-pointer hover:text-white transition-colors appearance-none"
                value={COMMON_LANGUAGES.some(l => l.value === language) ? language : 'custom'}
                onChange={handleLanguageChange}
            >
                {COMMON_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value} className="bg-zinc-900 text-zinc-300">{lang.label}</option>
                ))}
                <option value="custom" className="bg-zinc-900 text-zinc-300">Custom...</option>
            </select>
            {(!COMMON_LANGUAGES.some(l => l.value === language) || language === 'custom') && (
                <input 
                    type="text" 
                    placeholder=".ext" 
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-xs text-white outline-none focus:border-blue-500"
                    value={language === 'custom' ? customExt : language}
                    onChange={handleCustomExtChange}
                />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Копировать"
          >
            {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={handleDownload} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Скачать"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title={isExpanded ? "Свернуть" : "Развернуть"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div 
        className={`relative bg-zinc-950 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}
      >
        <pre className="m-0 p-4 font-mono text-sm overflow-x-auto text-zinc-300">
          <NodeViewContent as="code" />
        </pre>
      </div>
      
      {!isExpanded && (
        <div className="px-4 py-2 text-xs text-zinc-500 italic bg-zinc-950/50 cursor-pointer hover:text-zinc-400" onClick={() => setIsExpanded(true)}>
            {props.node.textContent.slice(0, 50) || 'Empty code block'}...
        </div>
      )}
    </NodeViewWrapper>
  );
}
