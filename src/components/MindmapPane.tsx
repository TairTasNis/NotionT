import React from 'react';

export default function MindmapPane() {
  return (
    <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
      {/* Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="text-zinc-500 text-sm font-mono z-10 bg-zinc-900/80 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
        Mindmap Canvas (Placeholder)
      </div>
    </div>
  );
}
