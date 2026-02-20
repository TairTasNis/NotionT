import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { X, Plus, Trash2, Settings } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function BarChartComponent(props: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState(props.node.attrs.data);
  const [tempTitle, setTempTitle] = useState(props.node.attrs.title);
  const [tempColor, setTempColor] = useState(props.node.attrs.color);
  const [tempType, setTempType] = useState(props.node.attrs.type || 'simple');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(props.node.attrs.width || '100%');
  const [height, setHeight] = useState(props.node.attrs.height || '300px');
  const [isResizing, setIsResizing] = useState(false);

  // Sync state when props change (e.g. undo/redo)
  useEffect(() => {
    setTempData(props.node.attrs.data);
    setTempTitle(props.node.attrs.title);
    setTempColor(props.node.attrs.color);
    setTempType(props.node.attrs.type || 'simple');
    setWidth(props.node.attrs.width || '100%');
    setHeight(props.node.attrs.height || '300px');
  }, [props.node.attrs]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = typeof width === 'number' ? width : (e.currentTarget.parentElement?.offsetWidth || 600);
    const startHeight = parseInt(height.toString());

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        const newWidth = Math.max(300, startWidth + dx);
        const newHeight = Math.max(200, startHeight + dy);
        
        setWidth(newWidth);
        setHeight(`${newHeight}px`);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Update attributes on mouse up
        props.updateAttributes({
            width: typeof width === 'number' ? width : undefined, // Keep as string if percentage, but here we convert to px on resize
            height: height
        });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    // Ensure we have a deep copy and valid structure
    const dataCopy = props.node.attrs.data.map((item: any) => ({
        name: item.name,
        value: item.value,
        value2: item.value2 || 0,
        fill: item.fill || '' // Add individual color support
    }));
    setTempData(dataCopy);
    setTempTitle(props.node.attrs.title);
    setTempColor(props.node.attrs.color);
    setTempType(props.node.attrs.type || 'simple');
    setSelectedIndex(null);
  };

  const handleSave = () => {
    props.updateAttributes({
      data: tempData,
      title: tempTitle,
      color: tempColor,
      type: tempType,
      width,
      height
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    props.deleteNode();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAddDataPoint = () => {
    setTempData([...tempData, { name: 'New', value: 10, value2: 0, fill: '' }]);
  };

  const handleRemoveDataPoint = (index: number) => {
    const newData = [...tempData];
    newData.splice(index, 1);
    setTempData(newData);
  };

  const handleDataChange = (index: number, field: string, value: string | number) => {
    const newData = [...tempData];
    newData[index] = { ...newData[index], [field]: value };
    setTempData(newData);
  };

  // Drag and Drop Handlers for Data List
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set data to prevent browser from defaulting to text selection dragging
    e.dataTransfer.setData('text/plain', JSON.stringify(tempData[index]));

    // Create a custom drag image
    const dragIcon = document.createElement('div');
    dragIcon.style.width = '10px';
    dragIcon.style.height = '10px';
    dragIcon.style.backgroundColor = 'transparent';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 0, 0);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newData = [...tempData];
    const draggedItem = newData[draggedItemIndex];
    newData.splice(draggedItemIndex, 1);
    newData.splice(index, 0, draggedItem);
    
    setTempData(newData);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <NodeViewWrapper className="my-8 relative group inline-block" style={{ width: width }}>
      <div 
        className={`border border-zinc-800 rounded-xl p-4 bg-zinc-900/50 hover:border-zinc-700 transition-colors cursor-pointer relative ${isResizing ? 'ring-2 ring-blue-500' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        <h3 className="text-center text-zinc-400 font-medium mb-4 select-none">{props.node.attrs.title}</h3>
        <div className="w-full" style={{ height: height, minHeight: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {props.node.attrs.type === 'line' ? (
                <LineChart data={props.node.attrs.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="value" name="Значение" stroke={props.node.attrs.color} strokeWidth={2} dot={{ fill: props.node.attrs.color }} />
                </LineChart>
            ) : props.node.attrs.type === 'gantt' ? (
                <BarChart data={props.node.attrs.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                            return (
                                <div className="bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs text-white">
                                <p className="font-medium mb-1">{label}</p>
                                <p>Начало: {payload[0]?.value}</p>
                                <p>Длительность: {payload[1]?.value}</p>
                                </div>
                            );
                            }
                            return null;
                        }}
                    />
                    <Legend payload={[{ value: 'Длительность', type: 'rect', color: props.node.attrs.color }]} />
                    <Bar dataKey="value" stackId="a" fillOpacity={0} isAnimationActive={false} />
                    <Bar dataKey="value2" stackId="a" radius={[0, 4, 4, 0]}>
                        {props.node.attrs.data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            ) : props.node.attrs.type === 'horizontal' ? (
                <BarChart data={props.node.attrs.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Значение 1" radius={[0, 4, 4, 0]}>
                        {props.node.attrs.data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            ) : props.node.attrs.type === 'pie' || props.node.attrs.type === 'donut' ? (
                <PieChart>
                    <Pie
                        data={props.node.attrs.data}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={70}
                        innerRadius={props.node.attrs.type === 'donut' ? 40 : 0}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={props.node.attrs.type === 'donut' ? 5 : 0}
                    >
                        {props.node.attrs.data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                </PieChart>
            ) : props.node.attrs.type === 'radar' ? (
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={props.node.attrs.data}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} stroke="#444" />
                    <Radar name="Значение" dataKey="value" stroke={props.node.attrs.color} fill={props.node.attrs.color} fillOpacity={0.5} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                </RadarChart>
            ) : (
                <BarChart data={props.node.attrs.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend />
                <Bar dataKey="value" name="Значение 1" radius={props.node.attrs.type === 'stacked' ? [0,0,0,0] : [4, 4, 0, 0]} stackId={props.node.attrs.type === 'stacked' ? 'a' : undefined}>
                    {props.node.attrs.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
                {props.node.attrs.type === 'stacked' && (
                    <Bar dataKey="value2" name="Значение 2" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                )}
                </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button onClick={handleDoubleClick} className="p-1 bg-zinc-800 rounded text-zinc-400 hover:text-white" title="Настройки">
                <Settings size={14} />
            </button>
        </div>
        
        {/* Resize Handle */}
        <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
            onMouseDown={handleResizeStart}
        >
            <div className="w-3 h-3 bg-zinc-600 rounded-br-lg rounded-tl-sm hover:bg-blue-500 transition-colors"></div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={handleCancel}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[600px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings size={18} className="text-zinc-400" />
                Настройки диаграммы
              </h3>
              <button onClick={handleCancel} className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* General Settings */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Общие</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Заголовок</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600"
                      placeholder="Введите название графика"
                      value={tempTitle}
                      onChange={e => setTempTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Тип</label>
                    <div className="relative">
                      <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none transition-all"
                          value={tempType}
                          onChange={e => setTempType(e.target.value)}
                      >
                          <option value="simple">Обычная (столбцы)</option>
                          <option value="horizontal">Горизонтальная (линейчатая)</option>
                          <option value="stacked">С накоплением</option>
                          <option value="line">Линейная</option>
                          <option value="gantt">Диаграмма Ганта</option>
                          <option value="pie">Круговая</option>
                          <option value="donut">Кольцевая</option>
                          <option value="radar">Полярная (Radar)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Основной цвет</label>
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                        <input 
                          type="color" 
                          className="h-6 w-6 rounded cursor-pointer bg-transparent border-none p-0"
                          value={tempColor}
                          onChange={e => setTempColor(e.target.value)}
                          disabled={tempType === 'pie' || tempType === 'donut'}
                        />
                        <span className="text-sm text-zinc-400 font-mono uppercase">{tempColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Editor */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Данные (Перетащите для сортировки)</h4>
                  <button 
                    onClick={handleAddDataPoint} 
                    className="text-xs font-medium flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <Plus size={14} /> Добавить ряд
                  </button>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_70px_70px_50px_40px] gap-px bg-zinc-800 border-b border-zinc-800">
                      <div className="bg-zinc-900/50"></div>
                      <div className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900/50">
                        {tempType === 'gantt' ? 'Задача' : 'Название'}
                      </div>
                      <div className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900/50 text-center">
                        {tempType === 'gantt' ? 'Начало' : 'Знач. 1'}
                      </div>
                      <div className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900/50 text-center">
                        {(tempType === 'stacked' || tempType === 'gantt') ? (tempType === 'gantt' ? 'Длит.' : 'Знач. 2') : '-'}
                      </div>
                      <div className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900/50 text-center">
                        Цвет
                      </div>
                      <div className="bg-zinc-900/50"></div>
                  </div>
                  
                  <div className="max-h-[240px] overflow-y-auto">
                    {tempData.map((item: any, index: number) => (
                      <div 
                        key={index} 
                        className={`grid grid-cols-[40px_1fr_70px_70px_50px_40px] gap-px bg-zinc-800 group ${selectedIndex === index ? 'ring-1 ring-blue-500 z-10' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedIndex(index)}
                      >
                        <div className="bg-zinc-900 flex items-center justify-center cursor-move text-zinc-600 hover:text-zinc-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        </div>
                        <div className="bg-zinc-900">
                          <input 
                            type="text" 
                            className="w-full h-full bg-transparent px-4 py-2.5 text-sm text-white outline-none focus:bg-zinc-800/50 transition-colors placeholder-zinc-700"
                            placeholder="Название"
                            value={item.name}
                            onChange={e => handleDataChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="bg-zinc-900">
                          <input 
                            type="number" 
                            className="w-full h-full bg-transparent px-2 py-2.5 text-sm text-white text-center outline-none focus:bg-zinc-800/50 transition-colors placeholder-zinc-700"
                            placeholder="0"
                            value={item.value}
                            onChange={e => handleDataChange(index, 'value', Number(e.target.value))}
                          />
                        </div>
                        <div className="bg-zinc-900">
                          {(tempType === 'stacked' || tempType === 'gantt') ? (
                              <input 
                              type="number" 
                              className="w-full h-full bg-transparent px-2 py-2.5 text-sm text-white text-center outline-none focus:bg-zinc-800/50 transition-colors placeholder-zinc-700"
                              placeholder="0"
                              value={item.value2 || 0}
                              onChange={e => handleDataChange(index, 'value2', Number(e.target.value))}
                              />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                                -
                            </div>
                          )}
                        </div>
                        <div className="bg-zinc-900 flex items-center justify-center">
                            <input 
                                type="color" 
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                                value={item.fill || COLORS[index % COLORS.length]}
                                onChange={e => handleDataChange(index, 'fill', e.target.value)}
                            />
                        </div>
                        <div className="bg-zinc-900 flex items-center justify-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveDataPoint(index); }} 
                            className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Удалить ряд"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {tempData.length === 0 && (
                      <div className="p-8 text-center text-zinc-500 text-sm bg-zinc-900">
                        Нет данных. Нажмите "Добавить ряд".
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
              <button 
                onClick={handleDelete} 
                className="text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Trash2 size={16} /> Удалить
              </button>
              <div className="flex gap-3">
                <button 
                    onClick={handleCancel} 
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    Отмена
                </button>
                <button 
                    onClick={handleSave} 
                    className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
