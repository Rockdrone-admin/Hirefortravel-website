"use client";
import React, { useState } from 'react';

export default function ResizableTable({ 
  columns, 
  data, 
  sortConfig, 
  onSort, 
  onSelectAll, 
  allSelected, 
  hasCheckbox = true,
  children 
}) {
  const [colWidths, setColWidths] = useState(() => {
    // Attempt to load saved column widths from localStorage
    if (typeof window !== 'undefined') {
      const savedWidths = localStorage.getItem('hirefortravel_table_widths');
      if (savedWidths) {
        try {
          return JSON.parse(savedWidths);
        } catch (e) {
          console.error("Failed to parse saved column widths", e);
        }
      }
    }
    // Fallback to default widths
    return columns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth || 150;
      return acc;
    }, {});
  });

  const handleResizeStart = (e, colKey) => {
    e.preventDefault();
    const startX = e.clientX;
    
    const colIdx = columns.findIndex(col => col.key === colKey);
    const nextCol = colIdx !== -1 && colIdx < columns.length - 1 ? columns[colIdx + 1] : null;
    
    const startWidthA = colWidths[colKey] !== undefined ? colWidths[colKey] : (columns[colIdx]?.defaultWidth || 150);
    const startWidthB = nextCol ? (colWidths[nextCol.key] !== undefined ? colWidths[nextCol.key] : (nextCol.defaultWidth || 150)) : null;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidths = { ...colWidths };

      if (nextCol) {
        let newWidthA = startWidthA + deltaX;
        let newWidthB = startWidthB - deltaX;

        if (newWidthA < 60) {
          const diff = 60 - newWidthA;
          newWidthA = 60;
          newWidthB = newWidthB - diff;
        }
        if (newWidthB < 60) {
          const diff = 60 - newWidthB;
          newWidthB = 60;
          newWidthA = newWidthA - diff;
        }

        newWidths[colKey] = newWidthA;
        newWidths[nextCol.key] = newWidthB;
      } else {
        newWidths[colKey] = Math.max(60, startWidthA + deltaX);
      }

      setColWidths(newWidths);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hirefortravel_table_widths', JSON.stringify(newWidths));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="overflow-x-auto scrollbar-none">
      <table className="text-left border-collapse w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {hasCheckbox && <col style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }} />}
          {columns.map(col => (
            <col key={col.key} style={{ width: `${colWidths[col.key] || 150}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-black">
            {hasCheckbox && (
              <th 
                className="px-1 py-3 text-center" 
                style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}
              >
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded text-green-700 focus:ring-green-700 border-gray-300 h-4 w-4"
                />
              </th>
            )}
            {columns.map(col => {
              const isSortable = col.sortable;
              const isSorted = sortConfig && sortConfig.key === col.sortKey;
              const sortIndicator = isSorted ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : '';

              return (
                <th 
                  key={col.key}
                  onClick={() => isSortable && onSort && onSort(col.sortKey)}
                  className={`group relative px-4 py-3 select-none ${isSortable ? 'cursor-pointer hover:bg-gray-150 transition-colors' : ''} ${col.headerClassName || ''}`}
                >
                  <span className="truncate pr-3 block">{col.label} {isSortable && sortIndicator}</span>
                  
                  {col.resizable !== false && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-green-700 bg-gray-200/40 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                      onMouseDown={(e) => handleResizeStart(e, col.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">
          {data.map((item, idx) => children(item, idx))}
        </tbody>
      </table>
    </div>
  );
}
