import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { AppView } from '../../types/court';

export const TopNav: React.FC = () => {
  const { currentView, setCurrentView, activeProject, openProjectInWorkspace } = useProjectStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ label: string; view: AppView }> = [
    { label: 'Overview', view: 'landing' },
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'New Project', view: 'create' },
    { label: 'Engineering', view: 'engineering' },
    { label: 'Settings', view: 'settings' },
  ];

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleOpenStudio = () => {
    if (activeProject) {
      openProjectInWorkspace(activeProject.id);
    } else {
      setCurrentView('create');
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#111318]/95 border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavigate('landing')}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F2F4F7] hover:text-[#F07827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Sports Ground Studio
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9AA4B2]">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNavigate(item.view)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#F2F4F7] border-[#F07827]'
                    : 'text-[#9AA4B2] border-transparent hover:text-[#F2F4F7]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="hidden md:flex items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenStudio}
            className="px-4 py-2 text-xs font-semibold tracking-wide bg-[#F07827] text-[#111318] rounded-md hover:bg-[#ff8a3d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open 3D Studio
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#F2F4F7] bg-[#1A2029] border border-white/10 rounded-md"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1A2029] border-b border-white/10 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => handleNavigate(item.view)}
              className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium min-h-[44px] ${
                currentView === item.view
                  ? 'bg-[#202630] text-[#F07827]'
                  : 'text-[#F2F4F7] hover:bg-[#202630]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleOpenStudio}
            className="w-full px-4 py-3 mt-2 text-sm font-semibold bg-[#F07827] text-[#111318] rounded-md min-h-[44px]"
          >
            Open 3D Studio
          </button>
        </div>
      )}
    </header>
  );
};
