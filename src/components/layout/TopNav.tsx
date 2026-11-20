import React, { useState } from 'react';
import { LogIn, LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useAuthWorkspace } from '../../store/useAuthWorkspaceStore';
import { useProjectStore } from '../../store/useProjectStore';
import { AppView } from '../../types/court';

export const TopNav: React.FC = () => {
  const { currentView, setCurrentView, activeProject, openProjectInWorkspace } = useProjectStore();
  const { authLoading, userProfile, activeWorkspace, signInWithGoogle, signOutUser } =
    useAuthWorkspace();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInSportsProjectContext =
    Boolean(activeProject) && (currentView === 'engineering' || currentView === 'settings');

  const navItems: Array<{ label: string; view: AppView }> = [
    { label: 'Overview', view: 'landing' },
    { label: 'Workspaces', view: 'dashboard' },
    ...(isInSportsProjectContext
      ? [
          { label: 'Engineering & Cost', view: 'engineering' as AppView },
          { label: 'Settings', view: 'settings' as AppView },
        ]
      : []),
  ];

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleOpenActiveStudio = () => {
    if (activeProject) {
      openProjectInWorkspace(activeProject.id);
    } else {
      setCurrentView('create');
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#111318]/95 border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark + Active Workspace Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => handleNavigate('landing')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F2F4F7] hover:text-[#F07827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            My3D Studio
          </button>
          {activeWorkspace && (
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="hidden xl:inline text-xs font-mono-tech text-[#9AA4B2] hover:text-[#F2F4F7] truncate max-w-[200px] cursor-pointer"
              title="Switch Workspace"
            >
              · {activeWorkspace.label}
            </button>
          )}
        </div>

        {/* Zone 2: Focused Global + Contextual Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9AA4B2]">
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

        {/* Zone 3: Auth & Contextual Action */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {!authLoading &&
            (userProfile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('dashboard')}
                  className="px-2.5 py-1.5 bg-[#1A2029] hover:bg-[#202630] border border-white/10 rounded-md flex items-center gap-2 text-xs text-[#F2F4F7] cursor-pointer"
                  title={`${userProfile.displayName} (${userProfile.email})`}
                >
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#1686C9]" />
                  )}
                  <span className="max-w-[120px] truncate">{userProfile.displayName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-2 bg-[#1A2029] hover:bg-white/10 border border-white/10 rounded-md text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-3.5 py-2 text-xs font-medium bg-[#1A2029] hover:bg-[#202630] border border-white/15 text-[#F2F4F7] rounded-md inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1686C9]" />
                Sign in with Google
              </button>
            ))}

          {isInSportsProjectContext && (
            <button
              type="button"
              onClick={handleOpenActiveStudio}
              className="px-4 py-2 text-xs font-semibold tracking-wide bg-[#F07827] text-[#111318] rounded-md hover:bg-[#ff8a3d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              3D Studio
            </button>
          )}

          {currentView === 'landing' && (
            <button
              type="button"
              onClick={() => handleNavigate('create')}
              className="px-4 py-2 text-xs font-semibold tracking-wide bg-[#F07827] text-[#111318] rounded-md hover:bg-[#ff8a3d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Facility
            </button>
          )}
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

          {!authLoading &&
            (userProfile ? (
              <button
                type="button"
                onClick={() => {
                  void signOutUser();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-3 rounded-md text-sm font-medium text-[#9AA4B2] hover:bg-[#202630] inline-flex items-center gap-2 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                Sign out ({userProfile.displayName})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void signInWithGoogle();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-sm font-semibold bg-[#1686C9] text-white rounded-md inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Google
              </button>
            ))}

          {isInSportsProjectContext && (
            <button
              type="button"
              onClick={handleOpenActiveStudio}
              className="w-full px-4 py-3 mt-2 text-sm font-semibold bg-[#F07827] text-[#111318] rounded-md min-h-[44px]"
            >
              3D Studio
            </button>
          )}
        </div>
      )}
    </header>
  );
};
