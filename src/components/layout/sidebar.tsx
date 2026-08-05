// ============================================================================
// SwitchFile — Sidebar Component (Column 1)
// ============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FolderOpen,
  Settings,
  RefreshCw,
  Cpu,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS = [
  { id: 'home', label: 'Beranda', icon: Home, href: '/' },
  { id: 'files', label: 'Semua File', icon: FolderOpen, href: '/all-files' },
  { id: 'ai', label: 'AI', icon: BrainCircuit, href: '/ai-tools' },
  { id: 'settings', label: 'Pengaturan & History', icon: Settings, href: '/settings' },
] as const;

// ============================================================================
// Component
// ============================================================================

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex h-full w-[260px] flex-col border-r border-border bg-card", className)}>
      {/* ── Brand Logo ── */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-md">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            SwitchFile
          </h1>
          <p className="text-[11px] font-medium text-muted-foreground">
            File Converter
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#2563EB]/10 text-[#2563EB] shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] transition-colors',
                  isActive
                    ? 'text-[#2563EB]'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 text-[#2563EB]/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Widget ── */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#1E293B] p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#2563EB]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Processing
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Unlimited</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            100% Local • No Upload
          </p>

          {/* Usage Bar (visual only — always "unlimited") */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full w-full rounded-full bg-[#2563EB]" />
          </div>
        </div>
      </div>
    </aside>
  );
}
