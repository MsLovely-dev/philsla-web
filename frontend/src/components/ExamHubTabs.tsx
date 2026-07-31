import { ClipboardList, Layers, Shield, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export type ExamHubTabKey = 'blueprints' | 'setAssembly' | 'builder' | 'published' | 'audit';

interface ExamHubTabsProps {
  activeTab: ExamHubTabKey;
  onTabChange: (tab: ExamHubTabKey) => void;
  className?: string;
}

const EXAM_HUB_TABS: Array<{
  key: ExamHubTabKey;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { key: 'blueprints', label: 'Exam Blueprint', icon: ClipboardList },
  { key: 'setAssembly', label: 'Exam Set Assembly', icon: Layers },
  { key: 'builder', label: 'Exam Builder', icon: Shield },
  { key: 'published', label: 'Published Exams', icon: Shield },
  { key: 'audit', label: 'Audit Logs', icon: FileText },
];

export function ExamHubTabs({ activeTab, onTabChange, className }: ExamHubTabsProps) {
  return (
    <div className={cn("border-b border-slate-200", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {EXAM_HUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer border",
                isActive
                  ? "bg-white border-slate-900 text-slate-900 shadow-sm"
                  : "bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-slate-700" : "text-slate-400")} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
