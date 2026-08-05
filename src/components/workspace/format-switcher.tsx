// ============================================================================
// SwitchFile — Format Switcher Component
// ============================================================================

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import type { FileFormat } from '@/types';
import { getTargetFormats, getFormatLabel, ALL_FORMATS } from '@/lib/format-utils';

// ============================================================================
// Props
// ============================================================================

interface FormatSwitcherProps {
  sourceFormat: FileFormat | null;
  targetFormat: FileFormat | null;
  onSourceChange: (format: FileFormat | null) => void;
  onTargetChange: (format: FileFormat | null) => void;
  activeCategory?: CategoryFilter;
}

// ============================================================================
// Component
// ============================================================================

import type { CategoryFilter } from '@/types';

export function FormatSwitcher({
  sourceFormat,
  targetFormat,
  onSourceChange,
  onTargetChange,
  activeCategory = 'all',
}: FormatSwitcherProps) {
  const availableTargets = sourceFormat
    ? getTargetFormats(sourceFormat)
    : [];

  const shownSourceFormats = ALL_FORMATS.filter((fmt) => {
    if (activeCategory === 'all' || activeCategory === 'compressor') return true;
    if (activeCategory === 'documents') {
      return ['pdf', 'docx', 'xlsx', 'txt'].includes(fmt);
    }
    if (activeCategory === 'images') {
      return ['png', 'jpg', 'webp', 'heic'].includes(fmt);
    }
    return true;
  });

  const shownTargetFormats = sourceFormat
    ? availableTargets
    : ALL_FORMATS.filter((fmt) => {
        if (activeCategory === 'all' || activeCategory === 'compressor') return true;
        if (activeCategory === 'documents') {
          return ['pdf', 'docx', 'xlsx', 'txt'].includes(fmt);
        }
        if (activeCategory === 'images') {
          return ['png', 'jpg', 'webp', 'heic'].includes(fmt);
        }
        return true;
      });

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        CONVERT FORMAT
      </h2>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* ── Source Format Selector ── */}
        <div className="flex-1 w-full">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            From
          </label>
          <Select
            value={sourceFormat ?? 'auto'}
            onValueChange={(val) =>
              onSourceChange(val === 'auto' ? null : (val as FileFormat))
            }
          >
            <SelectTrigger className="h-12 rounded-lg bg-muted/40 text-sm font-medium">
              <SelectValue placeholder="Auto-Detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                  Auto-Detect
                </span>
              </SelectItem>
              {shownSourceFormats.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    {getFormatLabel(fmt)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Arrow ── */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 self-center md:mt-6">
          <ArrowRight className="h-5 w-5 text-[#2563EB] rotate-90 md:rotate-0 transition-transform" />
        </div>

        {/* ── Target Format Selector ── */}
        <div className="flex-1 w-full">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            To
          </label>
          <Select
            value={targetFormat ?? ''}
            onValueChange={(val) => onTargetChange(val as FileFormat)}
            disabled={shownTargetFormats.length === 0 && !sourceFormat}
          >
            <SelectTrigger className="h-12 rounded-lg bg-muted/40 text-sm font-medium">
              <SelectValue placeholder="Select target format" />
            </SelectTrigger>
            <SelectContent>
              {shownTargetFormats.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                    {getFormatLabel(fmt)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
