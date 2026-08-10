// ============================================================================
// SwitchFile — History Panel Component (Column 3)
// ============================================================================

'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreVertical,
  Trash2,
  FileText,
  Image,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { ConversionHistoryEntry } from '@/types';
import { formatFileSize, getFormatLabel } from '@/lib/format-utils';
import { cn } from '@/lib/utils';

// ============================================================================
// Props
// ============================================================================

interface HistoryPanelProps {
  history: ConversionHistoryEntry[];
  isLoading: boolean;
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function isImageFormat(format: string): boolean {
  return ['png', 'jpg', 'webp', 'heic', 'avif'].includes(format);
}

// ============================================================================
// Component
// ============================================================================

export function HistoryPanel({
  history,
  isLoading,
  onClearHistory,
  onDeleteEntry,
}: HistoryPanelProps) {
  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Recent History
          </h3>
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearHistory}
            className="h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-[#2563EB]" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs font-medium text-muted-foreground">
            No conversion history yet
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Your recent conversions will appear here
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1.5">
            {history.map((entry) => {
              const Icon = isImageFormat(entry.sourceFormat)
                ? Image
                : FileText;

              return (
                <div
                  key={entry.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {/* ── Icon ── */}
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                      entry.status === 'success'
                        ? 'bg-[#16A34A]/10'
                        : 'bg-destructive/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        entry.status === 'success'
                          ? 'text-[#16A34A]'
                          : 'text-destructive'
                      )}
                    />
                  </div>

                  {/* ── Info ── */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {entry.fileName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>
                        {getFormatLabel(entry.sourceFormat)} →{' '}
                        {getFormatLabel(entry.targetFormat)}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(entry.originalSizeBytes)}</span>
                      {entry.status === 'success' ? (
                        <Check className="h-3 w-3 text-[#16A34A]" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </div>

                  {/* ── Time & Actions ── */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground/60">
                      {getTimeAgo(entry.createdAt)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                          className="h-6 w-6 rounded-md opacity-0 transition-opacity group-hover:opacity-100 inline-flex items-center justify-center"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => onDeleteEntry(entry.id)}
                          className="text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
