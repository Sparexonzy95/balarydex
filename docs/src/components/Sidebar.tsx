import React from 'react';
import { DOCS_NAVIGATION } from '../data/docsNavigation';
import { ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDocId,
  onSelectDoc,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-72 border-r border-[color:var(--border-subtle)] bg-[#080808] p-5 overflow-y-auto transition-transform duration-200 md:translate-x-0 md:static md:w-64 lg:w-72 md:p-6 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {DOCS_NAVIGATION.map((category) => (
            <div key={category.title}>
              <h5 className="mb-2 text-[11px] font-mono uppercase tracking-[0.12em] text-ash/80">
                {category.title}
              </h5>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive = currentDocId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectDoc(item.id);
                        onCloseMobile();
                      }}
                      className={`group flex w-full items-center justify-between rounded-[6px] px-3 py-2 text-left text-[13px] transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-ash hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                      {isActive && <ChevronRight size={14} className="text-white/60 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
