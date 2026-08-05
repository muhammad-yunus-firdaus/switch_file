// ============================================================================
// SwitchFile — Category Tabs Component
// ============================================================================

'use client';

import { Tabs, TabsList, TabsTrigger, TabsIndicator } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Image, Minimize2, LayoutGrid } from 'lucide-react';
import type { CategoryFilter } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface CategoryTabsProps {
  activeTab: CategoryFilter;
  onTabChange: (tab: CategoryFilter) => void;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: { value: CategoryFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'documents', label: 'Documents', icon: FileText },
  { value: 'images', label: 'Images', icon: Image },
  { value: 'compressor', label: 'Compressor', icon: Minimize2 },
];

// ============================================================================
// Component
// ============================================================================

export function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  return (
    <div className="w-full">
      {/* Mobile Select Dropdown Pill */}
      <div className="block md:hidden w-full">
        <Select
          value={activeTab}
          onValueChange={(val) => onTabChange(val as CategoryFilter)}
        >
          <SelectTrigger className="w-full h-11 justify-between rounded-xl border border-border bg-card px-4 text-sm font-medium hover:border-blue-400 hover:bg-slate-50/80 cursor-pointer">
            <span className="text-muted-foreground mr-1 text-xs">Kategori:</span>
            <SelectValue placeholder="Semua (All)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua (All)</SelectItem>
            <SelectItem value="documents">Dokumen (Documents)</SelectItem>
            <SelectItem value="images">Gambar (Images)</SelectItem>
            <SelectItem value="compressor">Kompresor (Compressor)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Horizontal Tabs */}
      <div className="hidden md:block w-full">
        <Tabs
          value={activeTab}
          onValueChange={(val) => onTabChange(val as CategoryFilter)}
          className="w-full"
        >
          <TabsList className="relative h-12 w-full overflow-x-auto gap-1 rounded-xl bg-muted/60 p-1 flex items-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative z-10 gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-200 cursor-pointer select-none text-muted-foreground hover:bg-slate-100 hover:text-foreground/80 active:scale-95 duration-200 data-[state=active]:bg-transparent data-[state=active]:text-[#2563EB] data-[state=active]:shadow-none data-[state=active]:active:scale-100"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
            <TabsIndicator className="absolute bottom-1 top-1 rounded-lg bg-white shadow-sm transition-all duration-200" />
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
