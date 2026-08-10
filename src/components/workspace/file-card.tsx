// ============================================================================
// SwitchFile — File Card Component
// ============================================================================

'use client';

import {
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FileItem } from '@/types';
import { formatFileSize, getFormatLabel } from '@/lib/format-utils';

// ============================================================================
// Props
// ============================================================================

interface FileCardProps {
  file: FileItem;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================



function getStatusColor(status: FileItem['status']) {
  switch (status) {
    case 'queued':
      return 'bg-muted text-muted-foreground';
    case 'converting':
      return 'bg-[#2563EB]/10 text-[#2563EB]';
    case 'converted':
      return 'bg-[#16A34A]/10 text-[#16A34A]';
    case 'error':
      return 'bg-destructive/10 text-destructive';
  }
}

// ============================================================================
// Component
// ============================================================================

export function FileCard({ file, onDownload, onRemove }: FileCardProps) {
  const statusColor = getStatusColor(file.status);
  const isImage = ['png', 'jpg', 'webp', 'heic', 'avif'].includes(file.sourceFormat);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        file.status === 'error' && 'border-destructive/30'
      )}
    >
      {/* ── Format Icon Badge ── */}
      <div
        className={cn(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
          file.status === 'converted'
            ? 'bg-[#16A34A]/10'
            : 'bg-[#2563EB]/10'
        )}
      >
        {isImage ? (
          <ImageIcon
            className={cn(
              'h-5 w-5',
              file.status === 'converted'
                ? 'text-[#16A34A]'
                : 'text-[#2563EB]'
            )}
          />
        ) : (
          <FileText
            className={cn(
              'h-5 w-5',
              file.status === 'converted'
                ? 'text-[#16A34A]'
                : 'text-[#2563EB]'
            )}
          />
        )}
      </div>

      {/* ── File Info ── */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {file.name}
          </p>
          <Badge variant="outline" className="flex-shrink-0 text-[10px] font-semibold uppercase">
            {getFormatLabel(file.sourceFormat)} → {getFormatLabel(file.targetFormat)}
          </Badge>
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {file.convertedSize && (
            <>
              <span>→</span>
              <span className="font-medium text-[#16A34A]">
                {formatFileSize(file.convertedSize)}
              </span>
              {file.size > file.convertedSize && (
                <Badge className="text-[10px] font-semibold bg-[#16A34A]/10 text-[#16A34A] border-none">
                  hemat {Math.round(((file.size - file.convertedSize) / file.size) * 100)}%
                </Badge>
              )}
            </>
          )}
          {file.processingTimeMs && (
            <span className="text-muted-foreground/60">
              {file.processingTimeMs}ms
            </span>
          )}
        </div>

        {/* ── Progress Bar ── */}
        {file.status === 'converting' && (
          <div className="mt-2">
            <Progress value={file.progress} className="h-1.5" />
          </div>
        )}

        {/* ── Error Message ── */}
        {file.status === 'error' && file.errorMessage && (
          <p className="mt-1 text-xs text-destructive">{file.errorMessage}</p>
        )}
      </div>

      {/* ── Status Indicator ── */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            statusColor
          )}
        >
          {file.status === 'queued' && 'Queued'}
          {file.status === 'converting' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Converting...
            </>
          )}
          {file.status === 'converted' && (
            <>
              <Check className="h-3 w-3" />
              Converted
            </>
          )}
          {file.status === 'error' && (
            <>
              <AlertCircle className="h-3 w-3" />
              Failed
            </>
          )}
        </div>

        {/* ── Actions ── */}
        {file.status === 'converted' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(file.id)}
            className="h-8 gap-1.5 rounded-lg border-[#16A34A]/30 text-xs font-medium text-[#16A34A] hover:bg-[#16A34A]/10 hover:text-[#16A34A]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        )}

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(file.id)}
          className="h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
