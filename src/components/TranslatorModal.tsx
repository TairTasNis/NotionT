import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Copy, Check, RefreshCw, Languages } from 'lucide-react';

interface TranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onReplace?: (text: string) => void;
}

const LANGUAGES = [
  { code: 'ru', name: 'Russian' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
];

export default function TranslatorModal({ isOpen, onClose, initialText = '', onReplace }: TranslatorModalProps) {
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('ru');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSourceText(initialText);
      setTranslatedText('');
      setError('');
    }
  }, [isOpen, initialText]);

  // Auto-translate with debounce
  useEffect(() => {
    if (!isOpen || !sourceText.trim()) return;

    const timer = setTimeout(() => {
        handleTranslate();
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, isOpen]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      // Using MyMemory Translation API (Free, no key required for limited usage)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=${sourceLang}|${targetLang}`
      );
      
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        setTranslatedText(data.responseData.translatedText);
      } else {
        setError(data.responseDetails || 'Translation failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReplace = () => {
    if (onReplace) {
      onReplace(translatedText);
      onClose();
    }
  };

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[700px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Languages size={18} className="text-blue-400" />
            Переводчик
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <select 
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-blue-500 w-full"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSwapLanguages}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title="Поменять местами"
          >
            <RefreshCw size={16} />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-blue-500 w-full"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleTranslate}
            disabled={isLoading || !sourceText.trim()}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Перевод...' : 'Перевести'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-800 min-h-[300px]">
          {/* Source */}
          <div className="p-4 flex flex-col">
            <textarea 
              className="flex-1 bg-transparent text-white resize-none outline-none placeholder-zinc-600"
              placeholder="Введите текст для перевода..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
            <div className="mt-2 text-xs text-zinc-500 text-right">
              {sourceText.length} chars
            </div>
          </div>

          {/* Target */}
          <div className="p-4 flex flex-col bg-zinc-900/30">
            {error ? (
              <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                {error}
              </div>
            ) : (
              <textarea 
                className="flex-1 bg-transparent text-white resize-none outline-none placeholder-zinc-600"
                placeholder="Перевод появится здесь..."
                value={translatedText}
                readOnly
              />
            )}
            
            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-zinc-500">
                Powered by MyMemory
              </div>
              <div className="flex gap-2">
                {translatedText && (
                  <>
                    <button 
                      onClick={handleCopy}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors flex items-center gap-1 text-xs"
                      title="Копировать"
                    >
                      {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                    {onReplace && (
                      <button 
                        onClick={handleReplace}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded text-xs transition-colors"
                      >
                        Заменить выделенное
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
