import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebaseClient';
import {
  acceptInvitation,
  createOrganization,
  createWorkspaceProject,
  deleteOrganization,
  deleteWorkspaceProject,
  fetchOrganization,
  inviteMemberByEmail,
  leaveOrganization,
  removeMember,
  renameOrganization,
  renameWorkspaceProject,
  revokeInvitation,
  setWorkspaceProjectStatus,
  subscribeIncomingInvitations,
  subscribeOrgInvitations,
  subscribeOrgMemberships,
  subscribeUserMemberships,
  subscribeWorkspaceProjects,
  syncUserProfile,
  updateMemberRole,
} from '../firebase/workspaceService';
import { CourtProject } from '../types/court';
import {
  ActiveWorkspace,
  Invitation,
  Membership,
  Organization,
  OrgRole,
  ProjectModule,
  ToastMessage,
  UserProfile,
  WorkspaceProject,
} from '../types/workspace';

interface AuthWorkspaceContextValue {
  authLoading: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  memberships: Membership[];
  organizations: Record<string, Organization>;
  activeWorkspace: ActiveWorkspace | null;
  switchToPersonalWorkspace: () => void;
  switchToOrganization: (orgId: string) => void;
  orgMembers: Membership[];
  orgInvitations: Invitation[];
  incomingInvitations: Invitation[];
  workspaceProjects: WorkspaceProject[];
  projectsLoading: boolean;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  createOrg: (name: string) => Promise<Organization | null>;
  renameOrg: (orgId: string, name: string) => Promise<boolean>;
  deleteOrg: (orgId: string) => Promise<boolean>;
  leaveOrg: (orgId: string) => Promise<boolean>;
  inviteMember: (email: string, role: Exclude<OrgRole, 'owner'>) => Promise<boolean>;
  acceptInvite: (invitation: Invitation) => Promise<boolean>;
  revokeInvite: (invitationId: string) => Promise<void>;
  changeMemberRole: (membershipId: string, role: Exclude<OrgRole, 'owner'>) => Promise<void>;
  kickMember: (membershipId: string) => Promise<void>;
  createContainerProject: (
    name: string,
    module: ProjectModule,
    initialCourtSpec?: CourtProject
  ) => Promise<WorkspaceProject | null>;
  renameProject: (projectId: string, name: string) => Promise<boolean>;
  archiveProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  removeProject: (projectId: string, module: ProjectModule) => Promise<void>;
}

const AuthWorkspaceContext = createContext<AuthWorkspaceContextValue | null>(null);

function formatErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
    if (parsed.error) {
      if (parsed.error.toLowerCase().includes('missing or insufficient permissions')) {
        return `Permission denied (${parsed.operationType ?? 'operation'} on ${parsed.path ?? 'resource'}).`;
      }
      return parsed.error;
    }
  } catch {
    // Plain error string
  }
  return raw;
}

const ACTIVE_WS_STORAGE_KEY = 'sgs_active_workspace_v1';

export const AuthWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organizations, setOrganizations] = useState<Record<string, Organization>>({});
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_WS_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [orgMembers, setOrgMembers] = useState<Membership[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<Invitation[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<Invitation[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  // Auth listener & profile synchronization
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setMemberships([]);
        setOrganizations({});
        setOrgMembers([]);
        setOrgInvitations([]);
        setIncomingInvitations([]);
        setWorkspaceProjects([]);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await syncUserProfile(user);
        setUserProfile(profile);
      } catch (err) {
        pushToast({
          type: 'error',
          title: 'Profile Sync Failed',
          detail: formatErrorMessage(err),
        });
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, [pushToast]);

  // Subscribe to current user's memberships + incoming invitations
  useEffect(() => {
    if (authLoading || !firebaseUser || !userProfile) return;

    const unsubMemberships = subscribeUserMemberships(
      firebaseUser.uid,
      (list) => setMemberships(list),
      (err) =>
        pushToast({
          type: 'error',
          title: 'Failed to load workspaces',
          detail: formatErrorMessage(err),
        })
    );

    const unsubInvites = userProfile.email
      ? subscribeIncomingInvitations(
          userProfile.email,
          (list) => setIncomingInvitations(list),
          (err) =>
            pushToast({
              type: 'error',
              title: 'Failed to load invitations',
              detail: formatErrorMessage(err),
            })
        )
      : () => undefined;

    return () => {
      unsubMemberships();
      unsubInvites();
    };
  }, [authLoading, firebaseUser, userProfile, pushToast]);

  // Fetch organization metadata for each membership
  useEffect(() => {
    if (!firebaseUser || memberships.length === 0) {
      if (memberships.length === 0) setOrganizations({});
      return;
    }

    let cancelled = false;
    const loadOrgs = async () => {
      const entries = await Promise.all(
        memberships.map(async (m) => {
          try {
            const org = await fetchOrganization(m.orgId);
            return org ? ([org.orgId, org] as const) : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, Organization> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setOrganizations(next);
    };

    void loadOrgs();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, memberships]);

  // Resolve active workspace cleanly; fallback to personal if membership was removed
  const activeWorkspace: ActiveWorkspace | null = useMemo(() => {
    if (!firebaseUser || !userProfile) return null;
    if (activeOrgId) {
      const membership = memberships.find((m) => m.orgId === activeOrgId);
      if (membership) {
        return {
          type: 'org',
          orgId: activeOrgId,
          label: organizations[activeOrgId]?.name ?? 'Organization',
          role: membership.role,
        };
      }
    }
    return {
      type: 'user',
      uid: firebaseUser.uid,
      label: 'Personal Workspace',
    };
  }, [firebaseUser, userProfile, activeOrgId, memberships, organizations]);

  const switchToPersonalWorkspace = useCallback(() => {
    setActiveOrgId(null);
    try {
      localStorage.removeItem(ACTIVE_WS_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  const switchToOrganization = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    try {
      localStorage.setItem(ACTIVE_WS_STORAGE_KEY, orgId);
    } catch {
      // Ignore storage error
    }
  }, []);

  // Subscribe to workspace projects for active workspace
  useEffect(() => {
    if (authLoading || !firebaseUser || !activeWorkspace) {
      setWorkspaceProjects([]);
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    const ownerType = activeWorkspace.type === 'org' ? 'org' : 'user';
    const ownerId = activeWorkspace.type === 'org' ? activeWorkspace.orgId : activeWorkspace.uid;

    const unsub = subscribeWorkspaceProjects(
      ownerType,
      ownerId,
      (list) => {
        setWorkspaceProjects(list);
        setProjectsLoading(false);
      },
      (err) => {
        setProjectsLoading(false);
        pushToast({
          type: 'error',
          title: 'Failed to load workspace projects',
          detail: formatErrorMessage(err),
        });
      }
    );

    return () => unsub();
  }, [authLoading, firebaseUser, activeWorkspace, pushToast]);

  // Subscribe to organization members & invitations when an organization is active
  useEffect(() => {
    if (authLoading || !firebaseUser || !activeWorkspace || activeWorkspace.type !== 'org') {
      setOrgMembers([]);
      setOrgInvitations([]);
      return;
    }

    const unsubMembers = subscribeOrgMemberships(
      activeWorkspace.orgId,
      (list) => setOrgMembers(list),
      (err) =>
        pushToast({
          type: 'error',
          title: 'Failed to load organization members',
          detail: formatErrorMessage(err),
        })
    );

    const canManageInvites =
      activeWorkspace.role === 'owner' || activeWorkspace.role === 'admin';
    const unsubInvites = canManageInvites
      ? subscribeOrgInvitations(
          activeWorkspace.orgId,
          (list) => setOrgInvitations(list),
          (err) =>
            pushToast({
              type: 'error',
              title: 'Failed to load organization invitations',
              detail: formatErrorMessage(err),
            })
        )
      : () => {
          setOrgInvitations([]);
        };

    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [authLoading, firebaseUser, activeWorkspace, pushToast]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      pushToast({ type: 'success', title: 'Signed in with Google' });
    } catch (err) {
      const msg = formatErrorMessage(err);
      if (msg.includes('popup-closed-by-user')) return;
      pushToast({ type: 'error', title: 'Google Sign-In Failed', detail: msg });
    }
  }, [pushToast]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      switchToPersonalWorkspace();
      pushToast({ type: 'info', title: 'Signed out' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Sign-out failed', detail: formatErrorMessage(err) });
    }
  }, [pushToast, switchToPersonalWorkspace]);

  const createOrg = useCallback(
    async (name: string): Promise<Organization | null> => {
      if (!userProfile) return null;
      try {
        const { org } = await createOrganization(name, userProfile);
        setOrganizations((prev) => ({ ...prev, [org.orgId]: org }));
        switchToOrganization(org.orgId);
        pushToast({ type: 'success', title: `Organization "${org.name}" created` });
        return org;
      } catch (err) {
        pushToast({ type: 'error', title: 'Unable to create organization', detail: formatErrorMessage(err) });
        return null;
      }
    },
    [userProfile, switchToOrganization, pushToast]
  );

  const renameOrg = useCallback(
    async (orgId: string, name: string): Promise<boolean> => {
      try {
        await renameOrganization(orgId, name);
        const clean = name.trim().slice(0, 100);
        setOrganizations((prev) =>
          prev[orgId] ? { ...prev, [orgId]: { ...prev[orgId], name: clean } } : prev
        );
        pushToast({ type: 'success', title: `Organization renamed to "${clean}"` });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Unable to rename organization', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [pushToast]
  );

  const deleteOrg = useCallback(
    async (orgId: string): Promise<boolean> => {
      try {
        await deleteOrganization(orgId);
        setOrganizations((prev) => {
          const copy = { ...prev };
          delete copy[orgId];
          return copy;
        });
        if (activeOrgId === orgId) switchToPersonalWorkspace();
        pushToast({ type: 'info', title: 'Organization deleted' });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Unable to delete organization', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [activeOrgId, switchToPersonalWorkspace, pushToast]
  );

  const leaveOrg = useCallback(
    async (orgId: string): Promise<boolean> => {
      if (!userProfile) return false;
      try {
        await leaveOrganization(orgId, userProfile.uid);
        if (activeOrgId === orgId) switchToPersonalWorkspace();
        pushToast({ type: 'info', title: 'Left organization' });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Unable to leave organization', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [userProfile, activeOrgId, switchToPersonalWorkspace, pushToast]
  );

  const inviteMember = useCallback(
    async (email: string, role: Exclude<OrgRole, 'owner'>): Promise<boolean> => {
      if (!userProfile || !activeWorkspace || activeWorkspace.type !== 'org') return false;
      const org = organizations[activeWorkspace.orgId];
      if (!org) return false;
      try {
        await inviteMemberByEmail(org, email, role, userProfile.uid);
        pushToast({ type: 'success', title: `Invitation recorded for ${email.trim().toLowerCase()}` });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Invitation failed', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [userProfile, activeWorkspace, organizations, pushToast]
  );

  const acceptInvite = useCallback(
    async (invitation: Invitation): Promise<boolean> => {
      if (!userProfile) return false;
      try {
        await acceptInvitation(invitation, userProfile);
        switchToOrganization(invitation.orgId);
        pushToast({ type: 'success', title: `Joined ${invitation.orgName}` });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Could not accept invitation', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [userProfile, switchToOrganization, pushToast]
  );

  const revokeInvite = useCallback(
    async (invitationId: string) => {
      try {
        await revokeInvitation(invitationId);
        pushToast({ type: 'info', title: 'Invitation revoked' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Failed to revoke invitation', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const changeMemberRole = useCallback(
    async (membershipId: string, role: Exclude<OrgRole, 'owner'>) => {
      try {
        await updateMemberRole(membershipId, role);
        pushToast({ type: 'success', title: 'Member role updated' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Failed to update member role', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const kickMember = useCallback(
    async (membershipId: string) => {
      try {
        await removeMember(membershipId);
        pushToast({ type: 'info', title: 'Member removed from organization' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Failed to remove member', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const createContainerProject = useCallback(
    async (
      name: string,
      module: ProjectModule,
      initialCourtSpec?: CourtProject
    ): Promise<WorkspaceProject | null> => {
      if (!userProfile || !activeWorkspace) return null;
      const ownerType = activeWorkspace.type === 'org' ? 'org' : 'user';
      const ownerId = activeWorkspace.type === 'org' ? activeWorkspace.orgId : activeWorkspace.uid;
      try {
        const created = await createWorkspaceProject({
          ownerType,
          ownerId,
          name,
          module,
          createdBy: userProfile.uid,
          initialCourtSpec,
        });
        pushToast({ type: 'success', title: `Project "${created.name}" created` });
        return created;
      } catch (err) {
        pushToast({ type: 'error', title: 'Failed to create project', detail: formatErrorMessage(err) });
        return null;
      }
    },
    [userProfile, activeWorkspace, pushToast]
  );

  const renameProject = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      try {
        await renameWorkspaceProject(projectId, name);
        pushToast({ type: 'success', title: 'Project renamed' });
        return true;
      } catch (err) {
        pushToast({ type: 'error', title: 'Rename failed', detail: formatErrorMessage(err) });
        return false;
      }
    },
    [pushToast]
  );

  const archiveProject = useCallback(
    async (projectId: string) => {
      try {
        await setWorkspaceProjectStatus(projectId, 'archived');
        pushToast({ type: 'info', title: 'Project archived' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Archive failed', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const restoreProject = useCallback(
    async (projectId: string) => {
      try {
        await setWorkspaceProjectStatus(projectId, 'active');
        pushToast({ type: 'success', title: 'Project restored' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Restore failed', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const removeProject = useCallback(
    async (projectId: string, module: ProjectModule) => {
      try {
        await deleteWorkspaceProject(projectId, module);
        pushToast({ type: 'info', title: 'Project deleted' });
      } catch (err) {
        pushToast({ type: 'error', title: 'Delete failed', detail: formatErrorMessage(err) });
      }
    },
    [pushToast]
  );

  const value = useMemo<AuthWorkspaceContextValue>(
    () => ({
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
      toasts,
      pushToast,
      dismissToast,
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
    }),
    [
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
      toasts,
      pushToast,
      dismissToast,
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
    ]
  );

  return <AuthWorkspaceContext.Provider value={value}>{children}</AuthWorkspaceContext.Provider>;
};

export function useAuthWorkspace(): AuthWorkspaceContextValue {
  const ctx = useContext(AuthWorkspaceContext);
  if (!ctx) throw new Error('useAuthWorkspace must be used inside AuthWorkspaceProvider');
  return ctx;
}
