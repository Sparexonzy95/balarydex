import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { DOCS_NAVIGATION, DocItem } from '../data/docsNavigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectDoc,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allItems: DocItem[] = DOCS_NAVIGATION.flatMap((cat) => cat.items);
  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-[10px] border border-[color:var(--border-default)] bg-[#121212] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[color:var(--border-subtle)] gap-3">
          <Search size={18} className="text-ash shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation, guides, and contract references..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-[14px] text-white placeholder-ash/60 focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="text-ash hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-ash">
              No documentation pages found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectDoc(item.id);
                  onClose();
                }}
                className="group flex w-full items-center justify-between rounded-[6px] p-3 text-left hover:bg-white/[0.06] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase text-ash/80">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-medium text-white group-hover:text-white transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[12px] text-ash truncate max-w-md mt-0.5">
                    {item.description}
                  </p>
                </div>
                <ChevronRight size={14} className="text-ash/40 group-hover:text-white transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0e0e0e] px-4 py-2 border-t border-[color:var(--border-subtle)] flex items-center justify-between text-[11px] text-ash font-mono">
          <span>Navigate with mouse or keyboard</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
