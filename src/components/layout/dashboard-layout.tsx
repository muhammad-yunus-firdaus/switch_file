// ============================================================================
// SwitchFile — Dashboard Layout Component
// ============================================================================
// Wraps routes inside the common header, sidebar, and workspace grid shell.
// ============================================================================

'use client';

import { Sidebar } from './sidebar';
import { RefreshCw, Home, FolderOpen, Settings, BrainCircuit } from 'lucide-react';
import { useHistory } from '@/hooks/use-history';
import { HistoryPanel } from '@/components/panels/history-panel';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showRightPanel?: boolean;
}

export function DashboardLayout({ children, showRightPanel = false }: DashboardLayoutProps) {
  const pathname = usePathname();
  const {
    history,
    isLoading: isHistoryLoading,
    clearHistory,
    deleteEntry,
  } = useHistory(10);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden w-full relative">
      {/* ── Mobile Top Header ── */}
      <header className="flex md:hidden items-center px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-md">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              SwitchFile
            </h1>
            <p className="text-[9px] font-medium text-muted-foreground">
              File Converter
            </p>
          </div>
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <Sidebar className="hidden md:flex flex-shrink-0" />

      {/* ── Main Workspace ── */}
      <main className="flex flex-1 flex-col overflow-y-auto w-full pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 md:px-6 md:py-6 space-y-6">
          {children}

          {/* ── Mobile Stacking Bottom Panel (Only if showRightPanel is true) ── */}
          {showRightPanel && (
            <div className="block md:hidden space-y-6 pt-4 border-t border-border/80">
              <HistoryPanel
                history={history}
                isLoading={isHistoryLoading}
                onClearHistory={clearHistory}
                onDeleteEntry={deleteEntry}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Desktop Right Sidebar ── */}
      {showRightPanel && (
        <aside className="hidden md:flex w-[300px] flex-col gap-5 border-l border-border bg-card overflow-y-auto p-5 flex-shrink-0">
          <HistoryPanel
            history={history}
            isLoading={isHistoryLoading}
            onClearHistory={clearHistory}
            onDeleteEntry={deleteEntry}
          />
        </aside>
      )}

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 flex items-center justify-around md:hidden dark:bg-slate-900/95 dark:border-slate-800">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors cursor-pointer",
            pathname === '/' && "text-[#2563EB] font-semibold"
          )}
        >
          <Home className="h-5 w-5" />
          <span>Beranda</span>
        </Link>
        <Link
          href="/all-files"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors cursor-pointer",
            pathname === '/all-files' && "text-[#2563EB] font-semibold"
          )}
        >
          <FolderOpen className="h-5 w-5" />
          <span>Semua File</span>
        </Link>
        <Link
          href="/ai-tools"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors cursor-pointer",
            pathname === '/ai-tools' && "text-[#2563EB] font-semibold"
          )}
        >
          <BrainCircuit className="h-5 w-5" />
          <span>AI</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors cursor-pointer",
            pathname === '/settings' && "text-[#2563EB] font-semibold"
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Pengaturan &amp; History</span>
        </Link>
      </nav>
    </div>
  );
}
