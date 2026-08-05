// ============================================================================
// SwitchFile — Quick Tools Grid Component
// ============================================================================

'use client';

import {
  FileText,
  Image,
  Minimize2,
  Scissors,
  ArrowRightLeft,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';
import type { FileFormat, CategoryFilter } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// Props
// ============================================================================

interface QuickToolsProps {
  onToolSelect: (
    source: FileFormat | null,
    target: FileFormat | null,
    category: CategoryFilter
  ) => void;
}

// ============================================================================
// Tool Configuration
// ============================================================================

const QUICK_TOOLS = [
  {
    id: 'jpg-to-pdf',
    label: 'JPG to PDF',
    description: 'Convert images to PDF documents',
    sourceFormat: 'jpg' as FileFormat,
    targetFormat: 'pdf' as FileFormat,
    category: 'all' as CategoryFilter,
    icon: FileText,
    gradient: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-600',
    borderHover: 'hover:border-blue-300',
  },
  {
    id: 'png-to-webp',
    label: 'PNG to WebP',
    description: 'Optimize images for the web',
    sourceFormat: 'png' as FileFormat,
    targetFormat: 'webp' as FileFormat,
    category: 'images' as CategoryFilter,
    icon: Image,
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-600',
    borderHover: 'hover:border-emerald-300',
  },
  {
    id: 'compress-image',
    label: 'Compress Image',
    description: 'Reduce image file size',
    sourceFormat: null,
    targetFormat: null,
    category: 'compressor' as CategoryFilter,
    icon: Minimize2,
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-600',
    borderHover: 'hover:border-violet-300',
  },
  {
    id: 'xlsx-to-pdf',
    label: 'XLSX to PDF',
    description: 'Spreadsheet to PDF table',
    sourceFormat: 'xlsx' as FileFormat,
    targetFormat: 'pdf' as FileFormat,
    category: 'documents' as CategoryFilter,
    icon: FileSpreadsheet,
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-600',
    borderHover: 'hover:border-amber-300',
  },
  {
    id: 'pdf-to-png',
    label: 'PDF to PNG',
    description: 'Extract pages as images',
    sourceFormat: 'pdf' as FileFormat,
    targetFormat: 'png' as FileFormat,
    category: 'documents' as CategoryFilter,
    icon: ArrowRightLeft,
    gradient: 'from-rose-500/10 to-pink-500/10',
    iconColor: 'text-rose-600',
    borderHover: 'hover:border-rose-300',
  },
  {
    id: 'docx-to-pdf',
    label: 'DOCX to PDF',
    description: 'Word to PDF conversion',
    sourceFormat: 'docx' as FileFormat,
    targetFormat: 'pdf' as FileFormat,
    category: 'documents' as CategoryFilter,
    icon: Scissors,
    gradient: 'from-cyan-500/10 to-sky-500/10',
    iconColor: 'text-cyan-600',
    borderHover: 'hover:border-cyan-300',
  },
  {
    id: 'pptx-to-pdf',
    label: 'PPTX to PDF',
    description: 'Presentation to PDF document',
    sourceFormat: 'pptx' as FileFormat,
    targetFormat: 'pdf' as FileFormat,
    category: 'documents' as CategoryFilter,
    icon: Presentation,
    gradient: 'from-orange-500/10 to-red-500/10',
    iconColor: 'text-orange-600',
    borderHover: 'hover:border-orange-300',
  },
  {
    id: 'pdf-to-pptx',
    label: 'PDF to PPTX',
    description: 'Convert PDF back to slides',
    sourceFormat: 'pdf' as FileFormat,
    targetFormat: 'pptx' as FileFormat,
    category: 'documents' as CategoryFilter,
    icon: ArrowRightLeft,
    gradient: 'from-fuchsia-500/10 to-pink-500/10',
    iconColor: 'text-fuchsia-600',
    borderHover: 'hover:border-fuchsia-300',
  },
];

// ============================================================================
// Component
// ============================================================================

export function QuickTools({ onToolSelect }: QuickToolsProps) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {QUICK_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() =>
                onToolSelect(tool.sourceFormat, tool.targetFormat, tool.category)
              }
              className={cn(
                'group flex flex-col items-start gap-2 md:gap-3 rounded-xl border border-border bg-gradient-to-br p-3 md:p-4 text-left transition-all duration-200 cursor-pointer',
                'hover:-translate-y-1 hover:shadow-md hover:border-blue-200',
                tool.gradient
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 shadow-sm transition-transform duration-200 group-hover:scale-110',
                )}
              >
                <Icon className={cn('h-4.5 w-4.5', tool.iconColor)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {tool.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
