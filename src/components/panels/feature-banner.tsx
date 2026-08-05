// ============================================================================
// SwitchFile — Feature Banner Component (Column 3 Top)
// ============================================================================

'use client';

import { ScanLine, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Component
// ============================================================================

export function FeatureBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 text-slate-800 shadow-sm">
      {/* ── Background Decoration ── */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50/50 blur-2xl" />

      {/* ── Content ── */}
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]/10">
            <ScanLine className="h-4 w-4 text-[#2563EB]" />
          </div>
          <Badge className="border-[#2563EB]/20 bg-[#2563EB]/8 text-[10px] font-semibold text-[#2563EB]">
            Coming Soon
          </Badge>
        </div>

        <h3 className="mb-1 text-base font-bold text-slate-800">AI Document Extractor</h3>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Extract text from images and scanned PDFs with OCR powered by AI.
        </p>

        <button className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100">
          Learn More
          <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
