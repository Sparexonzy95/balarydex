import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { DOCS_ARTICLES } from './content/docsContent';
import { DOCS_NAVIGATION, DocItem } from './data/docsNavigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentDocId, setCurrentDocId] = useState<string>('intro');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentArticle = DOCS_ARTICLES[currentDocId] || DOCS_ARTICLES['intro'];

  // Flatten items for Prev / Next navigation
  const allItems: DocItem[] = DOCS_NAVIGATION.flatMap((cat) => cat.items);
  const currentIndex = allItems.findIndex((item) => item.id === currentDocId);
  const prevDoc = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextDoc = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#080808] text-bone">
      {/* Top Header */}
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          currentDocId={currentDocId}
          onSelectDoc={(id) => {
            setCurrentDocId(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Doc Content Body */}
        <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-14 py-8 lg:py-10 max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] font-mono text-ash mb-4">
            <span>Docs</span>
            <span>/</span>
            <span className="text-ash/90">{currentArticle.category}</span>
            <span>/</span>
            <span className="text-white font-medium">{currentArticle.title}</span>
          </div>

          {/* Title Header */}
          <header className="mb-8 border-b border-[color:var(--border-subtle)] pb-6">
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white mb-2">
              {currentArticle.title}
            </h1>
            <p className="text-[15px] text-ash leading-relaxed">
              {currentArticle.description}
            </p>
          </header>

          {/* Article Body */}
          <article className="prose prose-invert max-w-none">
            {currentArticle.content}
          </article>

          {/* Prev / Next Pagination Footer */}
          <div className="mt-14 pt-8 border-t border-[color:var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevDoc ? (
              <button
                onClick={() => {
                  setCurrentDocId(prevDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group flex flex-col items-start p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-ash group-hover:text-white transition-colors mb-1">
                  <ArrowLeft size={12} />
                  <span>Previous</span>
                </div>
                <span className="text-[14px] font-medium text-white group-hover:text-white truncate w-full">
                  {prevDoc.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextDoc && (
              <button
                onClick={() => {
                  setCurrentDocId(nextDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group flex flex-col items-end p-4 rounded-[8px] border border-[color:var(--border-default)] bg-[#121212] hover:border-white/20 transition-all text-right"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-ash group-hover:text-white transition-colors mb-1">
                  <span>Next</span>
                  <ArrowRight size={12} />
                </div>
                <span className="text-[14px] font-medium text-white group-hover:text-white truncate w-full">
                  {nextDoc.title}
                </span>
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectDoc={(id) => {
          setCurrentDocId(id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
