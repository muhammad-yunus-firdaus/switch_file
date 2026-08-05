// ============================================================================
// SwitchFile — File Queue Component
// ============================================================================

'use client';

import { Button } from '@/components/ui/button';
import { FileCard } from './file-card';
import { Play, Trash2, FolderArchive } from 'lucide-react';
import type { FileItem } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface FileQueueProps {
  files: FileItem[];
  isConverting: boolean;
  onStartConversion: () => void;
  onDownloadFile: (id: string) => void;
  onDownloadAll: () => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function FileQueue({
  files,
  isConverting,
  onStartConversion,
  onDownloadFile,
  onDownloadAll,
  onRemoveFile,
  onClearFiles,
}: FileQueueProps) {
  if (files.length === 0) return null;

  const queuedCount = files.filter((f) => f.status === 'queued').length;
  const convertedCount = files.filter((f) => f.status === 'converted').length;
  const hasConverted = convertedCount > 0;
  const hasQueued = queuedCount > 0;

  return (
    <div className="space-y-4">
      {/* ── Header & Actions ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Processing Queue
          </h3>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasQueued && (
            <Button
              onClick={onStartConversion}
              disabled={isConverting}
              size="sm"
              className="h-9 gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8] shadow-md shadow-[#2563EB]/25"
            >
              <Play className="h-3.5 w-3.5" />
              {isConverting ? 'Converting...' : 'Convert All'}
            </Button>
          )}

          {hasConverted && (
            <Button
              onClick={onDownloadAll}
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-[#16A34A]/30 px-4 text-xs font-semibold text-[#16A34A] hover:bg-[#16A34A]/10"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              Download All as ZIP
            </Button>
          )}

          <Button
            onClick={onClearFiles}
            size="sm"
            variant="ghost"
            className="h-9 gap-2 rounded-lg px-3 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Queue
          </Button>
        </div>
      </div>

      {/* ── File Cards List ── */}
      <div className="space-y-2">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onDownload={onDownloadFile}
            onRemove={onRemoveFile}
          />
        ))}
      </div>
    </div>
  );
}
