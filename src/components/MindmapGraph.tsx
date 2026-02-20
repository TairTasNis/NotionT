import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { HeadingNode } from '../utils/markdownParser';

interface MindmapGraphProps {
  data: HeadingNode;
  onNodeClick: (line: number) => void;
  readOnly?: boolean;
  onNodeAdd?: (parentId: string, text: string) => void;
  onNodeDelete?: (id: string) => void;
}

// Flatten the tree into nodes and links for force simulation
function flattenGraph(root: HeadingNode) {
  const nodes: (HeadingNode & { x?: number; y?: number })[] = [];
  const links: { source: string; target: string }[] = [];

  function traverse(node: HeadingNode) {
    nodes.push(node);
    if (node.children) {
      node.children.forEach(child => {
        links.push({ source: node.id, target: child.id });
        traverse(child);
      });
    }
  }

  traverse(root);
  return { nodes, links };
}

export default function MindmapGraph({ data, onNodeClick, readOnly, onNodeAdd, onNodeDelete }: MindmapGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; nodeId?: string } | null>(null);
  const [modal, setModal] = useState<{ 
    isOpen: boolean; 
    type: 'input' | 'confirm';
    nodeId: string; 
    title: string;
  } | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleModalConfirm = () => {
    if (!modal) return;

    if (modal.type === 'input') {
      if (inputValue.trim() && onNodeAdd) {
        onNodeAdd(modal.nodeId, inputValue.trim());
      }
    } else if (modal.type === 'confirm') {
      if (onNodeDelete) {
        onNodeDelete(modal.nodeId);
      }
    }
    
    setModal(null);
    setInputValue("");
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;
    
    const { nodes, links } = flattenGraph(data);

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "12px sans-serif")
      .style("user-select", "none");

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom)
       .on("contextmenu", (event) => {
         console.log("Background context menu triggered");
         if (readOnly) return;
         event.preventDefault();
         
         const rect = wrapperRef.current!.getBoundingClientRect();
         console.log("Setting context menu at:", event.clientX - rect.left, event.clientY - rect.top);
         setContextMenu({
           x: event.clientX - rect.left,
           y: event.clientY - rect.top,
           visible: true,
           nodeId: undefined // undefined means background
         });
       });

    // Simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide().radius(30));

    // Links
    const link = g.append("g")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    // Nodes group
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any)
      .on("click", (event, d) => {
        onNodeClick(d.line);
      })
      .on("contextmenu", (event, d) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        
        const rect = wrapperRef.current!.getBoundingClientRect();
        setContextMenu({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          visible: true,
          nodeId: d.id
        });
      });

    // Node Circles
    node.append("circle")
      .attr("r", d => Math.max(5, 12 - d.level * 2)) // Root is bigger, deeper nodes smaller
      .attr("fill", d => {
        if (d.level === 0) return "#fff";
        if (d.level === 1) return "#e4e4e7"; // zinc-200
        if (d.level === 2) return "#a1a1aa"; // zinc-400
        return "#52525b"; // zinc-600
      })
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5);

    // Labels
    node.append("text")
      .attr("dy", d => -Math.max(5, 12 - d.level * 2) - 5) // Position above circle
      .attr("text-anchor", "middle")
      .text(d => d.text.length > 20 ? d.text.substring(0, 20) + "..." : d.text)
      .attr("fill", "#e4e4e7") // zinc-200
      .style("font-size", d => Math.max(10, 16 - d.level * 2) + "px")
      .style("font-weight", d => d.level === 0 ? "bold" : "normal")
      .style("pointer-events", "none") // Let clicks pass to circle/group
      .clone(true).lower()
      .attr("stroke", "black")
      .attr("stroke-width", 3);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };

  }, [data, onNodeClick, readOnly]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-zinc-950 relative overflow-hidden">
       <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 bg-zinc-900/80 p-2 rounded-lg text-xs text-zinc-500 border border-white/10 pointer-events-none">
        Перетаскивайте узлы<br/>Клик для перехода к тексту<br/>ПКМ для редактирования
      </div>

      {/* React Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div 
          className="absolute bg-zinc-900 border border-zinc-700 rounded shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.nodeId ? (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu(null);
                  setInputValue("");
                  setModal({ isOpen: true, type: 'input', nodeId: contextMenu.nodeId!, title: 'Новый подпункт' });
                }}
              >
                Добавить подпункт
              </button>
              {contextMenu.nodeId !== 'root' && (
                <button 
                  className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu(null);
                    setModal({ isOpen: true, type: 'confirm', nodeId: contextMenu.nodeId!, title: 'Удалить узел?' });
                  }}
                >
                  Удалить узел
                </button>
              )}
            </>
          ) : (
            <button 
              className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(null);
                setInputValue("");
                setModal({ isOpen: true, type: 'input', nodeId: 'root', title: 'Новая тема' });
              }}
            >
              Добавить новую тему
            </button>
          )}
        </div>
      )}
      {/* Custom Input/Confirm Modal */}
      {modal && modal.isOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setModal(null)}>
          <div 
            className="bg-zinc-900 p-4 rounded-xl border border-white/10 w-80 shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4 text-white">{modal.title}</h3>
            
            {modal.type === 'input' ? (
              <input 
                autoFocus
                type="text" 
                className="w-full bg-zinc-950 border border-white/10 rounded p-2 mb-4 outline-none focus:border-white/30 text-white"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleModalConfirm();
                  if (e.key === 'Escape') setModal(null);
                }}
                placeholder="Введите текст..."
              />
            ) : (
              <p className="text-zinc-400 mb-6 text-sm">
                Вы уверены? Это действие удалит узел и все вложенные элементы.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setModal(null)} 
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleModalConfirm} 
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  modal.type === 'confirm' 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {modal.type === 'confirm' ? 'Удалить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
