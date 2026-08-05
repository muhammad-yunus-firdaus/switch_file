// ============================================================================
// SwitchFile — Drag-and-Drop Zone Component
// ============================================================================

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES } from '@/lib/format-utils';

// ============================================================================
// Props
// ============================================================================

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DropZone({ onFilesAdded, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  // ── Drag Event Handlers ──

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCountRef.current++;
      if (dragCountRef.current === 1) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current--;
      if (dragCountRef.current === 0) {
        setIsDragging(false);
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    },
    [onFilesAdded, disabled]
  );

  // ── Click Handler ──

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      if (selectedFiles.length > 0) {
        onFilesAdded(selectedFiles);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [onFilesAdded]
  );

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'group relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200',
        isDragging
          ? 'border-[#2563EB] bg-[rgba(37,99,235,0.05)] shadow-lg shadow-[#2563EB]/10'
          : 'border-[#93C5FD] bg-card hover:border-[#2563EB]/60 hover:bg-[rgba(37,99,235,0.02)]',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex flex-col items-center justify-center px-6 py-12">
        {/* ── Icon ── */}
        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200',
            isDragging
              ? 'bg-[#2563EB]/15 scale-110'
              : 'bg-[#2563EB]/8 group-hover:bg-[#2563EB]/12 group-hover:scale-105'
          )}
        >
          {isDragging ? (
            <FileUp className="h-8 w-8 text-[#2563EB] animate-bounce" />
          ) : (
            <Upload className="h-8 w-8 text-[#2563EB]" />
          )}
        </div>

        {/* ── Text ── */}
        <p className="mb-1 text-sm font-semibold text-foreground">
          {isDragging ? 'Drop your files here' : 'Click or drag your files here to convert'}
        </p>
        <p className="text-xs text-muted-foreground">
          Supports PDF, DOCX, XLSX, PNG, JPG, WebP, HEIC
        </p>

        {/* ── Add Button Badge ── */}
        <div
          className={cn(
            'mt-4 flex items-center gap-1.5 rounded-full border px-5 py-3 md:px-4 md:py-2 text-sm md:text-xs font-medium transition-all duration-200',
            isDragging
              ? 'border-[#2563EB] bg-[#2563EB] text-white'
              : 'border-border text-muted-foreground group-hover:border-[#2563EB]/40 group-hover:text-[#2563EB]'
          )}
        >
          <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
          Browse Files
        </div>
      </div>

      {/* ── Hidden File Input ── */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
      />
    </div>
  );
}
