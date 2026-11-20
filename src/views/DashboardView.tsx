import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  FileText,
  FolderOpen,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MailPlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sofa,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { STUDIO_MODULES } from '../core/studioModules';
import { useAuthWorkspace } from '../store/useAuthWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';
import { OrgRole, ProjectModule, WorkspaceProjectStatus } from '../types/workspace';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const MODULE_META: Record<
  ProjectModule,
  { label: string; shortLabel: string; tagline: string; accent: string; icon: React.FC<{ className?: string }> }
> = {
  sports: {
    label: STUDIO_MODULES.sports.name,
    shortLabel: STUDIO_MODULES.sports.shortLabel,
    tagline: STUDIO_MODULES.sports.tagline,
    accent: 'text-[#F07827]',
    icon: Compass,
  },
  house: {
    label: STUDIO_MODULES.house.name,
    shortLabel: STUDIO_MODULES.house.shortLabel,
    tagline: STUDIO_MODULES.house.tagline,
    accent: 'text-[#1686C9]',
    icon: Home,
  },
  furniture: {
    label: STUDIO_MODULES.furniture.name,
    shortLabel: STUDIO_MODULES.furniture.shortLabel,
    tagline: STUDIO_MODULES.furniture.tagline,
    accent: 'text-[#4CC38A]',
    icon: Sofa,
  },
};

export const DashboardView: React.FC = () => {
  const {
    authLoading,
    firebaseUser,
    userProfile,
    signInWithGoogle,
    signOutUser,
    memberships,
    organizations,
    activeWorkspace,
    switchToPersonalWorkspace,
    switchToOrganization,
    orgMembers,
    orgInvitations,
    incomingInvitations,
    workspaceProjects,
    projectsLoading,
    createOrg,
    renameOrg,
    deleteOrg,
    leaveOrg,
    inviteMember,
    acceptInvite,
    revokeInvite,
    changeMemberRole,
    kickMember,
    createContainerProject,
    renameProject,
    archiveProject,
    restoreProject,
    removeProject,
    pushToast,
  } = useAuthWorkspace();

  const {
    setCurrentView,
    openSportsWorkspaceProject,
    openContainerProject,
    seedSampleSportsProjects,
    importProject,
    cloudSyncing,
  } = useProjectStore();

  // Search & Filter states
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | ProjectModule>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkspaceProjectStatus>('ALL');

  // Create Org states
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Invite Member states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<OrgRole, 'owner'>>('collaborator');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Create Project Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectModule, setNewProjectModule] = useState<ProjectModule>('sports');
  const [creatingProject, setCreatingProject] = useState(false);

  // Org management states
  const [renamingOrg, setRenamingOrg] = useState(false);
  const [draftOrgName, setDraftOrgName] = useState('');
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false);

  // Inline Rename & Delete Confirm
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftProjectName, setDraftProjectName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaceProjects.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      const matchesModule = moduleFilter === 'ALL' || p.module === moduleFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesQuery && matchesModule && matchesStatus;
    });
  }, [workspaceProjects, query, moduleFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = workspaceProjects.length;
    const active = workspaceProjects.filter((p) => p.status === 'active').length;
    const archived = workspaceProjects.filter((p) => p.status === 'archived').length;
    const sports = workspaceProjects.filter((p) => p.module === 'sports').length;
    return { total, active, archived, sports, containers: total - sports };
  }, [workspaceProjects]);

  const canManageOrgMembers =
    activeWorkspace?.type === 'org' &&
    (activeWorkspace.role === 'owner' || activeWorkspace.role === 'admin');

  const canDeleteWorkspaceProject = (createdBy: string) => {
    if (!activeWorkspace || !userProfile) return false;
    if (activeWorkspace.type === 'user') return true;
    return (
      activeWorkspace.role === 'owner' ||
      activeWorkspace.role === 'admin' ||
      activeWorkspace.role === 'manager' ||
      createdBy === userProfile.uid
    );
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    const created = await createOrg(newOrgName);
    setCreatingOrg(false);
    if (created) {
      setNewOrgName('');
      setShowCreateOrg(false);
    }
  };

  const handleRenameOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || activeWorkspace.type !== 'org' || !draftOrgName.trim()) return;
    const ok = await renameOrg(activeWorkspace.orgId, draftOrgName);
    if (ok) {
      setRenamingOrg(false);
      setDraftOrgName('');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    const ok = await inviteMember(inviteEmail, inviteRole);
    setSendingInvite(false);
    if (ok) {
      setInviteEmail('');
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    const created = await createContainerProject(newProjectName, newProjectModule);
    setCreatingProject(false);
    if (created) {
      setNewProjectName('');
      setShowNewProjectModal(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!draftProjectName.trim()) return;
    const ok = await renameProject(projectId, draftProjectName);
    if (ok) {
      setEditingProjectId(null);
      setDraftProjectName('');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const res = importProject(text);
      if (res.ok && res.project) {
        pushToast({
          type: 'success',
          title: `Imported "${res.project.name}"`,
          detail: 'Saved to your active workspace.',
        });
      } else {
        pushToast({
          type: 'error',
          title: 'Import failed',
          detail: res.error || 'Invalid facility JSON.',
        });
      }
    } catch {
      pushToast({
        type: 'error',
        title: 'Import failed',
        detail: 'Failed to read selected JSON file.',
      });
    }
  };

  // 1. Auth Boot Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
        <TopNav />
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
          <Loader2 className="w-8 h-8 text-[#F07827] animate-spin" />
          <p className="text-sm text-[#9AA4B2]">Connecting to My3D Studio Workspace...</p>
        </main>
      </div>
    );
  }

  // 2. Signed-out Gate (Google Sign-In Only)
  if (!firebaseUser || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
        <TopNav />
        <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 sm:px-8 py-12 flex items-center">
          <div className="w-full bg-[#1A2029] border border-white/10 rounded-xl p-6 sm:p-10 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#F07827]">
                  My3D Studio · Multi-Tenant Cloud Workspace
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
                  Sign in with Google to access Personal &amp; Organization Workspaces
                </h1>
                <p className="text-sm text-[#9AA4B2] leading-relaxed">
                  Manage <strong className="text-[#F2F4F7]">Sports Ground Studio</strong> 3D CAD projects alongside{' '}
                  <strong className="text-[#F2F4F7]">Furniture Studio</strong> and{' '}
                  <strong className="text-[#F2F4F7]">House Studio</strong> containers inside{' '}
                  <strong className="text-[#F2F4F7]">My3D Studio</strong>. Create organizations, invite
                  team members by email, and collaborate with Firestore role-based access control.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="px-6 py-3 bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] text-sm font-semibold rounded-md transition-colors inline-flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('landing')}
                    className="px-5 py-3 bg-[#202630] hover:bg-white/10 border border-white/15 text-[#F2F4F7] text-sm font-medium rounded-md transition-colors cursor-pointer"
                  >
                    Return to 3D Preview
                  </button>
                </div>
              </div>

              <div className="lg:w-80 bg-[#111318] border border-white/10 rounded-lg p-5 space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#4CC38A] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#F2F4F7]">Google OAuth Only</div>
                    <div className="text-[#9AA4B2] mt-0.5">
                      Verified Google account session backed by strict Firestore security rules.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-[#1686C9] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#F2F4F7]">Personal &amp; Team Orgs</div>
                    <div className="text-[#9AA4B2] mt-0.5">
                      Switch seamlessly between personal drafts and shared organization studios.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Compass className="w-4 h-4 text-[#F07827] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#F2F4F7]">Synced 3D CAD Specs</div>
                    <div className="text-[#9AA4B2] mt-0.5">
                      Sports Ground projects sync full 3D layouts, CAD plans, BOM &amp; FCFA costing.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Authenticated Workspace Hub (Sidebar + Main Project Grid)
  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR: Profile, Workspace Switcher, Invitations & Members */}
        <aside className="w-full lg:w-80 shrink-0 space-y-5">
          {/* User Profile Card */}
          <section className="p-4 bg-[#1A2029] border border-white/10 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#202630] border border-white/15 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-[#1686C9]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-sm text-[#F2F4F7] truncate">
                  {userProfile.displayName}
                </div>
                <div className="text-xs text-[#9AA4B2] truncate">{userProfile.email}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="font-mono-tech text-[#9AA4B2]">Locale: {userProfile.locale}</span>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="inline-flex items-center gap-1.5 text-[#9AA4B2] hover:text-[#F2F4F7] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </section>

          {/* Workspace Switcher */}
          <section className="p-4 bg-[#1A2029] border border-white/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono-tech uppercase tracking-[0.12em] text-[#9AA4B2]">
                Workspaces
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateOrg((v) => !v)}
                className="text-xs font-medium text-[#F07827] hover:text-[#ff8a3d] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Org
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={switchToPersonalWorkspace}
                className={`w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                  activeWorkspace?.type === 'user'
                    ? 'bg-[#202630] border border-[#F07827]/60 text-[#F2F4F7] font-semibold'
                    : 'bg-[#111318]/60 border border-white/5 text-[#9AA4B2] hover:text-[#F2F4F7] hover:bg-[#202630]/60'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <UserIcon className="w-4 h-4 text-[#F07827] shrink-0" />
                  <span className="truncate">Personal Workspace</span>
                </span>
                <span className="font-mono-tech text-[11px] text-[#9AA4B2]">owner</span>
              </button>

              {memberships.map((m) => {
                const org = organizations[m.orgId];
                const isSelected =
                  activeWorkspace?.type === 'org' && activeWorkspace.orgId === m.orgId;
                return (
                  <button
                    key={m.membershipId}
                    type="button"
                    onClick={() => switchToOrganization(m.orgId)}
                    className={`w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#202630] border border-[#1686C9]/70 text-[#F2F4F7] font-semibold'
                        : 'bg-[#111318]/60 border border-white/5 text-[#9AA4B2] hover:text-[#F2F4F7] hover:bg-[#202630]/60'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-[#1686C9] shrink-0" />
                      <span className="truncate">{org?.name ?? 'Loading org...'}</span>
                    </span>
                    <span className="font-mono-tech text-[11px] text-[#9AA4B2] shrink-0">
                      {m.role}
                    </span>
                  </button>
                );
              })}
            </div>

            {showCreateOrg && (
              <form
                onSubmit={handleCreateOrgSubmit}
                className="pt-3 border-t border-white/10 space-y-2.5"
              >
                <label htmlFor="new-org-name" className="block text-xs text-[#9AA4B2]">
                  Organization Name
                </label>
                <input
                  id="new-org-name"
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g., Benin Civic Architecture"
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#1686C9]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={creatingOrg || !newOrgName.trim()}
                    className="flex-1 px-3 py-2 bg-[#1686C9] hover:bg-[#1e96de] disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {creatingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName('');
                    }}
                    className="px-2.5 py-2 bg-[#202630] text-xs text-[#9AA4B2] hover:text-[#F2F4F7] rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Incoming Invitations */}
          {incomingInvitations.length > 0 && (
            <section className="p-4 bg-[#17212B] border border-[#1686C9]/40 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-[0.12em] text-[#1686C9]">
                <MailPlus className="w-4 h-4" />
                <span>Pending Invitations ({incomingInvitations.length})</span>
              </div>
              <div className="space-y-2.5">
                {incomingInvitations.map((inv) => (
                  <div
                    key={inv.invitationId}
                    className="p-3 bg-[#111318] border border-white/10 rounded-md space-y-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F2F4F7]">{inv.orgName}</div>
                      <div className="text-[11px] text-[#9AA4B2]">
                        Invited as <span className="font-mono-tech text-[#F2F4F7]">{inv.role}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void acceptInvite(inv)}
                      className="w-full px-3 py-1.5 bg-[#1686C9] hover:bg-[#1e96de] text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                    >
                      Accept &amp; Join
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Organization Members & Invites (when inside an org) */}
          {activeWorkspace?.type === 'org' && (
            <section className="p-4 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono-tech uppercase tracking-[0.12em] text-[#9AA4B2] inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#1686C9]" />
                  Team ({orgMembers.length})
                </h2>
                <span className="text-[11px] font-mono-tech text-[#9AA4B2]">
                  Your role: {activeWorkspace.role}
                </span>
              </div>

              {canManageOrgMembers && (
                <form
                  onSubmit={handleInviteSubmit}
                  className="p-3 bg-[#111318] border border-white/10 rounded-md space-y-2"
                >
                  <label htmlFor="invite-member-email" className="block text-xs font-medium text-[#F2F4F7]">
                    Invite Member by Email
                  </label>
                  <input
                    id="invite-member-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@studio.com"
                    required
                    className="w-full px-2.5 py-1.5 bg-[#1A2029] border border-white/10 rounded text-xs text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#1686C9]"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Invited member role"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as Exclude<OrgRole, 'owner'>)
                      }
                      className="flex-1 px-2.5 py-1.5 bg-[#1A2029] border border-white/10 rounded text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
                    >
                      <option value="collaborator">collaborator</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={sendingInvite || !inviteEmail.trim()}
                      className="px-3 py-1.5 bg-[#F07827] hover:bg-[#ff8a3d] disabled:opacity-50 text-[#111318] text-xs font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      {sendingInvite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Invite
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {orgMembers.map((member) => {
                  const canEditMember = canManageOrgMembers && member.role !== 'owner';
                  return (
                    <div
                      key={member.membershipId}
                      className="p-2.5 bg-[#111318]/70 border border-white/8 rounded flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F2F4F7] truncate">
                          {member.userDisplayName}
                        </div>
                        <div className="text-[11px] text-[#9AA4B2] truncate">{member.userEmail}</div>
                      </div>

                      {canEditMember ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            aria-label={`Role for ${member.userDisplayName}`}
                            value={member.role}
                            onChange={(e) =>
                              void changeMemberRole(
                                member.membershipId,
                                e.target.value as Exclude<OrgRole, 'owner'>
                              )
                            }
                            className="px-1.5 py-1 bg-[#1A2029] border border-white/10 rounded text-[11px] text-[#F2F4F7]"
                          >
                            <option value="collaborator">collaborator</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            type="button"
                            title="Remove member"
                            aria-label={`Remove ${member.userDisplayName}`}
                            onClick={() => void kickMember(member.membershipId)}
                            className="p-1 text-[#9AA4B2] hover:text-red-400 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono-tech text-[11px] text-[#9AA4B2] shrink-0">
                          {member.role}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recorded Invitations */}
              {canManageOrgMembers && orgInvitations.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[#9AA4B2]">
                    Recorded Invitations
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {orgInvitations.map((inv) => (
                      <div
                        key={inv.invitationId}
                        className="p-2 bg-[#111318]/60 border border-white/8 rounded flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div className="text-[#F2F4F7] truncate">{inv.email}</div>
                          <div className="text-[#9AA4B2] font-mono-tech">
                            {inv.role} · {inv.status}
                          </div>
                        </div>
                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void revokeInvite(inv.invitationId)}
                            className="px-2 py-1 bg-[#202630] hover:bg-red-500/20 text-[#9AA4B2] hover:text-red-300 rounded cursor-pointer shrink-0"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organization Lifecycle Controls */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                {canManageOrgMembers &&
                  (renamingOrg ? (
                    <form onSubmit={(e) => void handleRenameOrgSubmit(e)} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={draftOrgName}
                        onChange={(e) => setDraftOrgName(e.target.value)}
                        maxLength={100}
                        autoFocus
                        aria-label="Organization name"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#111318] border border-[#1686C9] rounded text-xs text-[#F2F4F7] focus:outline-none"
                      />
                      <button
                        type="submit"
                        aria-label="Save organization name"
                        className="p-1.5 bg-[#1686C9] text-white rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename organization"
                        onClick={() => setRenamingOrg(false)}
                        className="p-1.5 bg-[#202630] text-[#9AA4B2] rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftOrgName(activeWorkspace.label);
                        setRenamingOrg(true);
                      }}
                      className="w-full px-3 py-1.5 bg-[#111318]/80 hover:bg-[#202630] border border-white/10 rounded text-xs text-[#F2F4F7] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-[#1686C9]" />
                      Rename Organization
                    </button>
                  ))}

                {activeWorkspace.role === 'owner' ? (
                  confirmDeleteOrg ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteOrg(activeWorkspace.orgId);
                          setConfirmDeleteOrg(false);
                        }}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded cursor-pointer"
                      >
                        Confirm Delete Org
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOrg(false)}
                        className="px-2.5 py-1.5 bg-[#202630] text-xs text-[#9AA4B2] rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOrg(true)}
                      className="w-full px-3 py-1.5 bg-[#111318]/80 hover:bg-red-500/15 border border-red-500/20 rounded text-xs text-red-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Organization
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => void leaveOrg(activeWorkspace.orgId)}
                    className="w-full px-3 py-1.5 bg-[#111318]/80 hover:bg-red-500/15 border border-white/10 rounded text-xs text-[#9AA4B2] hover:text-red-300 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    Leave Organization
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>

        {/* MAIN WORKSPACE AREA */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#9AA4B2] mb-1">
                {activeWorkspace?.type === 'org'
                  ? `Organization Workspace · Role: ${activeWorkspace.role}`
                  : 'Personal Workspace'}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
                {activeWorkspace?.label ?? 'Workspace Hub'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
                aria-label="Import sports facility JSON file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 bg-[#1A2029] hover:bg-[#202630] border border-white/15 text-[#F2F4F7] text-xs font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#1686C9]" />
                Import Sports JSON
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('create')}
                className="px-4 py-2.5 bg-[#1A2029] hover:bg-[#202630] border border-white/15 text-[#F2F4F7] text-xs font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#F07827]" />
                3D Sports Configurator
              </button>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2.5 bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>

          {/* Cloud Sync Banner */}
          {cloudSyncing && (
            <div className="px-4 py-2.5 bg-[#17212B] border border-[#1686C9]/40 rounded-lg text-xs text-[#F2F4F7] flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#1686C9] animate-spin shrink-0" />
              <span>Synchronizing project specification with Cloud Firestore...</span>
            </div>
          )}

          {/* Create Container Project Drawer/Panel */}
          {showNewProjectModal && (
            <section className="p-5 bg-[#1A2029] border border-[#F07827]/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                    Create Workspace Project
                  </h2>
                  <p className="text-xs text-[#9AA4B2]">
                    Scoped to <strong className="text-[#F2F4F7]">{activeWorkspace?.label}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close new project form"
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-1.5 text-[#9AA4B2] hover:text-[#F2F4F7] rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-proj-name" className="block text-xs font-medium text-[#F2F4F7] mb-1.5">
                    Project Name
                  </label>
                  <input
                    id="new-proj-name"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Cotonou Municipal Arena or Residence Villa A2"
                    maxLength={140}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#F07827]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-medium text-[#F2F4F7] mb-1.5">
                    Studio Module
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['sports', 'house', 'furniture'] as ProjectModule[]).map((mod) => {
                      const meta = MODULE_META[mod];
                      const Icon = meta.icon;
                      const active = newProjectModule === mod;
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => setNewProjectModule(mod)}
                          className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#202630] border-[#F07827] text-[#F2F4F7]'
                              : 'bg-[#111318]/70 border-white/10 text-[#9AA4B2] hover:text-[#F2F4F7]'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-xs text-[#F2F4F7]">
                            <Icon className={`w-4 h-4 ${meta.accent}`} />
                            {meta.label}
                          </div>
                          <div className="text-[11px] text-[#9AA4B2] mt-1">
                            {meta.tagline}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProjectModal(false);
                      setCurrentView('create');
                    }}
                    className="text-xs text-[#1686C9] hover:text-[#3ba3e3] cursor-pointer"
                  >
                    Or configure custom court standards in 3D Sports Wizard →
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewProjectModal(false)}
                      className="px-4 py-2 bg-[#202630] text-xs text-[#9AA4B2] hover:text-[#F2F4F7] rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingProject || !newProjectName.trim()}
                      className="px-5 py-2 bg-[#F07827] hover:bg-[#ff8a3d] disabled:opacity-50 text-[#111318] text-xs font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {creatingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Create Project
                    </button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {/* Workspace Summary Metrics */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
              <div className="text-xs text-[#9AA4B2]">Workspace Projects</div>
              <div className="font-mono-tech text-2xl font-semibold text-[#F2F4F7] mt-1">
                {metrics.total}
              </div>
            </div>
            <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
              <div className="text-xs text-[#9AA4B2]">Active</div>
              <div className="font-mono-tech text-2xl font-semibold text-[#4CC38A] mt-1">
                {metrics.active}
              </div>
            </div>
            <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
              <div className="text-xs text-[#9AA4B2]">Archived</div>
              <div className="font-mono-tech text-2xl font-semibold text-[#9AA4B2] mt-1">
                {metrics.archived}
              </div>
            </div>
            <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
              <div className="text-xs text-[#9AA4B2]">Sports / Containers</div>
              <div className="font-mono-tech text-2xl font-semibold text-[#F07827] mt-1">
                {metrics.sports}
                <span className="text-sm text-[#9AA4B2] font-normal"> / {metrics.containers}</span>
              </div>
            </div>
          </section>

          {/* Search & Filters */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#9AA4B2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects by name..."
                aria-label="Search projects by name"
                className="w-full pl-9 pr-3 py-2 bg-[#1A2029] border border-white/10 rounded-md text-xs text-[#F2F4F7] placeholder-[#9AA4B2] focus:outline-none focus:border-[#1686C9]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Module Filter */}
              <select
                aria-label="Filter by module"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value as 'ALL' | ProjectModule)}
                className="px-3 py-2 bg-[#1A2029] border border-white/10 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="ALL">All Modules</option>
                <option value="sports">Sports Ground</option>
                <option value="house">House Studio</option>
                <option value="furniture">Furniture Studio</option>
              </select>

              {/* Status Filter */}
              <div className="flex items-center bg-[#1A2029] border border-white/10 rounded-md p-0.5">
                {(['ALL', 'active', 'archived'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'bg-[#202630] text-[#F2F4F7]'
                        : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                    }`}
                  >
                    {status === 'ALL' ? 'All Status' : status}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Project Grid */}
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-48 bg-[#1A2029] border border-white/10 rounded-lg p-5 flex flex-col justify-between animate-pulse"
                >
                  <div className="space-y-3">
                    <div className="h-3 w-28 bg-white/10 rounded" />
                    <div className="h-5 w-48 bg-white/10 rounded" />
                    <div className="h-3 w-full bg-white/5 rounded" />
                  </div>
                  <div className="h-8 w-full bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 bg-[#1A2029] border border-white/10 rounded-lg text-center space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#202630] border border-white/10 flex items-center justify-center mx-auto text-[#F07827]">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                  {workspaceProjects.length === 0
                    ? `No projects in ${activeWorkspace?.label ?? 'this workspace'} yet`
                    : 'No matching projects'}
                </h2>
                <p className="text-xs text-[#9AA4B2] mt-1 max-w-md mx-auto">
                  {workspaceProjects.length === 0
                    ? 'Create a Sports Ground, House, or Furniture project container, or seed sample regulation sports facilities.'
                    : 'Clear or adjust your search text, module filter, or status filter.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-4 py-2 bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] text-xs font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Project
                </button>
                {workspaceProjects.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => void seedSampleSportsProjects()}
                    className="px-4 py-2 bg-[#202630] hover:bg-white/10 border border-white/15 text-[#F2F4F7] text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#1686C9]" />
                    Seed Sample Sports Facilities
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setModuleFilter('ALL');
                      setStatusFilter('ALL');
                    }}
                    className="px-4 py-2 bg-[#202630] hover:bg-white/10 border border-white/15 text-[#F2F4F7] text-xs font-medium rounded-md cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const modMeta = MODULE_META[project.module];
                const ModIcon = modMeta.icon;
                const isEditing = editingProjectId === project.projectId;
                const isArchived = project.status === 'archived';

                return (
                  <article
                    key={project.projectId}
                    className={`p-5 bg-[#1A2029] border rounded-lg flex flex-col justify-between gap-4 transition-colors ${
                      isArchived ? 'border-white/5 opacity-80' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Card Top Line */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-mono-tech text-[#F2F4F7]">
                          <ModIcon className={`w-3.5 h-3.5 ${modMeta.accent}`} />
                          {modMeta.shortLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-mono-tech text-[11px] ${
                            isArchived ? 'text-[#9AA4B2]' : 'text-[#4CC38A]'
                          }`}
                        >
                          {isArchived ? (
                            <Archive className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {project.status}
                        </span>
                      </div>

                      {/* Title or Inline Rename */}
                      {isEditing ? (
                        <form
                          onSubmit={(e) => void handleRenameSubmit(e, project.projectId)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            value={draftProjectName}
                            onChange={(e) => setDraftProjectName(e.target.value)}
                            maxLength={140}
                            autoFocus
                            aria-label="New project name"
                            className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#111318] border border-[#1686C9] rounded text-xs text-[#F2F4F7] focus:outline-none"
                          />
                          <button
                            type="submit"
                            aria-label="Save name"
                            className="p-1.5 bg-[#1686C9] text-white rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel rename"
                            onClick={() => setEditingProjectId(null)}
                            className="p-1.5 bg-[#202630] text-[#9AA4B2] rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-semibold text-base text-[#F2F4F7] line-clamp-1">
                            {project.name}
                          </h3>
                          <button
                            type="button"
                            title="Rename project"
                            aria-label={`Rename ${project.name}`}
                            onClick={() => {
                              setEditingProjectId(project.projectId);
                              setDraftProjectName(project.name);
                            }}
                            className="p-1 text-[#9AA4B2] hover:text-[#F2F4F7] rounded cursor-pointer shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-[#9AA4B2] line-clamp-2 min-h-[2rem]">
                        {project.summaryText ??
                          (project.module === 'sports'
                            ? 'Sports Ground CAD & civil engineering project.'
                            : `${modMeta.label} container ready for upcoming editor.`)}
                      </p>

                      <div className="text-[11px] font-mono-tech text-[#9AA4B2]">
                        Updated {formatRelativeTime(project.updatedAt)}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                      {project.module === 'sports' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void openSportsWorkspaceProject(project, 'workspace')}
                            className="flex-1 px-3 py-2 bg-[#1686C9] hover:bg-[#1e96de] text-white text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Open 3D Studio
                          </button>
                          <button
                            type="button"
                            title="Technical Plans, BOM & FCFA Cost"
                            aria-label={`Plans and cost for ${project.name}`}
                            onClick={() => void openSportsWorkspaceProject(project, 'engineering')}
                            className="p-2 bg-[#202630] hover:bg-white/10 text-[#F07827] rounded transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Facility Settings"
                            aria-label={`Settings for ${project.name}`}
                            onClick={() => void openSportsWorkspaceProject(project, 'settings')}
                            className="p-2 bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openContainerProject(project)}
                          className="flex-1 px-3 py-2 bg-[#202630] hover:bg-[#1686C9] text-[#F2F4F7] text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Open Container
                        </button>
                      )}

                      {isArchived ? (
                        <button
                          type="button"
                          title="Restore project"
                          aria-label={`Restore ${project.name}`}
                          onClick={() => void restoreProject(project.projectId)}
                          className="p-2 bg-[#202630] hover:bg-white/10 text-[#4CC38A] rounded transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Archive project"
                          aria-label={`Archive ${project.name}`}
                          onClick={() => void archiveProject(project.projectId)}
                          className="p-2 bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDeleteWorkspaceProject(project.createdBy) &&
                        (confirmDeleteId === project.projectId ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await removeProject(project.projectId, project.module);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Delete project"
                            aria-label={`Delete ${project.name}`}
                            onClick={() => setConfirmDeleteId(project.projectId)}
                            className="p-2 bg-[#202630] hover:bg-red-500/20 text-[#9AA4B2] hover:text-red-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
