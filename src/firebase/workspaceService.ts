import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  COURT_STANDARDS,
  GROUND_SYSTEM_PRESETS,
  normalizeProject,
} from '../constants/courtStandards';
import { CourtProject } from '../types/court';
import {
  Invitation,
  Membership,
  Organization,
  OrgRole,
  ProjectModule,
  ProjectOwnerType,
  UserProfile,
  WorkspaceProject,
  WorkspaceProjectStatus,
} from '../types/workspace';
import { db, handleFirestoreError, OperationType } from './firebaseClient';

function createSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function sanitizeForFirestore<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v === undefined || typeof v === 'function') continue;
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out as T;
  }
  return val;
}

export function buildProjectSummaryText(court: CourtProject): string {
  const std = COURT_STANDARDS[court.standard]?.shortLabel ?? court.standard;
  const gsId = court.groundSystem ?? COURT_STANDARDS[court.standard]?.defaultGroundSystem ?? 'concrete_slab';
  const gs = GROUND_SYSTEM_PRESETS.find((g) => g.id === gsId)?.shortLabel ?? gsId;
  return `${std} · ${gs} · ${court.dimensions.lengthM.toFixed(1)}×${court.dimensions.widthM.toFixed(1)} m`.slice(0, 240);
}

export function buildSportsSpecPayload(projectId: string, court: CourtProject) {
  return sanitizeForFirestore({
    projectId,
    module: 'sports' as const,
    schemaVersion: court.schemaVersion ?? 2,
    client: (court.client || '').slice(0, 120),
    location: (court.location || '').slice(0, 120),
    notes: (court.notes || '').slice(0, 2000),
    sport: (court.sport ?? COURT_STANDARDS[court.standard]?.sport ?? 'basketball').slice(0, 40),
    standard: court.standard,
    groundSystem: (court.groundSystem ?? COURT_STANDARDS[court.standard]?.defaultGroundSystem ?? 'concrete_slab').slice(0, 40),
    environment: court.environment,
    template: court.template,
    courtStatus: court.status,
    unit: court.unit,
    dimensions: court.dimensions,
    materials: court.materials,
    sportLayers: (court.sportLayers ?? []).slice(0, 20),
    environmentSettings: court.environmentSettings,
    cameraSettings: court.cameraSettings,
    engineeringAssumptions: court.engineeringAssumptions,
    costConfig: court.costConfig,
    objects: court.objects.slice(0, 250),
    updatedAt: serverTimestamp(),
  });
}

export function hydrateCourtProjectFromSpec(
  wsProject: WorkspaceProject,
  specData: Record<string, unknown>
): CourtProject {
  const courtStatus =
    typeof specData.courtStatus === 'string'
      ? specData.courtStatus
      : wsProject.status === 'archived'
      ? 'Archived'
      : 'Draft';

  return normalizeProject({
    ...(specData as Partial<CourtProject>),
    id: wsProject.projectId,
    name: wsProject.name,
    status: courtStatus as CourtProject['status'],
    createdAt: wsProject.createdAt,
    updatedAt: tsToIso(specData.updatedAt ?? wsProject.updatedAt),
    lastOpenedAt: new Date().toISOString(),
  } as CourtProject);
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const email = (user.email || '').trim().toLowerCase();
  const displayName = (user.displayName || email.split('@')[0] || 'Studio User').trim().slice(0, 120);
  const locale = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 20) || 'en';
  const photoURL = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const createPayload = sanitizeForFirestore({
        uid: user.uid,
        email,
        displayName,
        photoURL,
        locale,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(ref, createPayload);
      const now = new Date().toISOString();
      return { uid: user.uid, email, displayName, photoURL, locale, createdAt: now, updatedAt: now };
    }

    const updatePayload = sanitizeForFirestore({
      email,
      displayName,
      photoURL,
      locale,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(ref, updatePayload);
    const data = snap.data();
    return {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      locale,
      createdAt: tsToIso(data.createdAt),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  const path = `organizations/${orgId}`;
  try {
    const snap = await getDoc(doc(db, 'organizations', orgId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      orgId: String(d.orgId),
      name: String(d.name),
      ownerId: String(d.ownerId),
      createdAt: tsToIso(d.createdAt),
      updatedAt: tsToIso(d.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeUserMemberships(
  uid: string,
  onData: (memberships: Membership[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = 'memberships';
  const q = query(collection(db, 'memberships'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Membership[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          membershipId: String(d.membershipId),
          orgId: String(d.orgId),
          userId: String(d.userId),
          role: d.role as OrgRole,
          userEmail: String(d.userEmail),
          userDisplayName: String(d.userDisplayName),
          sourceInvitationId: d.sourceInvitationId ? String(d.sourceInvitationId) : undefined,
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeOrgMemberships(
  orgId: string,
  onData: (memberships: Membership[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = `memberships(orgId=${orgId})`;
  const q = query(collection(db, 'memberships'), where('orgId', '==', orgId));
  return onSnapshot(
    q,
    (snap) => {
      const list: Membership[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          membershipId: String(d.membershipId),
          orgId: String(d.orgId),
          userId: String(d.userId),
          role: d.role as OrgRole,
          userEmail: String(d.userEmail),
          userDisplayName: String(d.userDisplayName),
          sourceInvitationId: d.sourceInvitationId ? String(d.sourceInvitationId) : undefined,
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeIncomingInvitations(
  emailLower: string,
  onData: (invitations: Invitation[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = 'invitations(incoming)';
  const q = query(
    collection(db, 'invitations'),
    where('email', '==', emailLower.trim().toLowerCase())
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Invitation[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            invitationId: String(d.invitationId),
            orgId: String(d.orgId),
            orgName: String(d.orgName),
            email: String(d.email),
            role: d.role as Exclude<OrgRole, 'owner'>,
            status: d.status as Invitation['status'],
            invitedBy: String(d.invitedBy),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        })
        .filter((inv) => inv.status === 'pending');
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeOrgInvitations(
  orgId: string,
  onData: (invitations: Invitation[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = `invitations(orgId=${orgId})`;
  const q = query(collection(db, 'invitations'), where('orgId', '==', orgId));
  return onSnapshot(
    q,
    (snap) => {
      const list: Invitation[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          invitationId: String(d.invitationId),
          orgId: String(d.orgId),
          orgName: String(d.orgName),
          email: String(d.email),
          role: d.role as Exclude<OrgRole, 'owner'>,
          status: d.status as Invitation['status'],
          invitedBy: String(d.invitedBy),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeWorkspaceProjects(
  ownerType: ProjectOwnerType,
  ownerId: string,
  onData: (projects: WorkspaceProject[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = `projects(${ownerType}:${ownerId})`;
  const q = query(
    collection(db, 'projects'),
    where('ownerType', '==', ownerType),
    where('ownerId', '==', ownerId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: WorkspaceProject[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            projectId: String(d.projectId),
            ownerType: d.ownerType as ProjectOwnerType,
            ownerId: String(d.ownerId),
            name: String(d.name),
            module: d.module as ProjectModule,
            status: d.status as WorkspaceProjectStatus,
            summaryText: d.summaryText ? String(d.summaryText) : undefined,
            createdBy: String(d.createdBy),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function createOrganization(
  name: string,
  user: UserProfile
): Promise<{ org: Organization; membership: Membership }> {
  const cleanName = name.trim().slice(0, 100);
  if (cleanName.length < 2) {
    throw new Error('Organization name must be at least 2 characters.');
  }
  const orgId = createSafeId('org');
  const membershipId = `${orgId}_${user.uid}`;
  const path = `organizations/${orgId}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', orgId), {
      orgId,
      name: cleanName,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'memberships', membershipId), {
      membershipId,
      orgId,
      userId: user.uid,
      role: 'owner',
      userEmail: user.email,
      userDisplayName: user.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    const now = new Date().toISOString();
    return {
      org: { orgId, name: cleanName, ownerId: user.uid, createdAt: now, updatedAt: now },
      membership: {
        membershipId,
        orgId,
        userId: user.uid,
        role: 'owner',
        userEmail: user.email,
        userDisplayName: user.displayName,
        createdAt: now,
        updatedAt: now,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function renameOrganization(orgId: string, name: string): Promise<void> {
  const cleanName = name.trim().slice(0, 100);
  if (cleanName.length < 2) {
    throw new Error('Organization name must be at least 2 characters.');
  }
  const path = `organizations/${orgId}`;
  try {
    await updateDoc(doc(db, 'organizations', orgId), {
      name: cleanName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOrganization(orgId: string): Promise<void> {
  const path = `organizations/${orgId}`;
  try {
    await deleteDoc(doc(db, 'organizations', orgId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function leaveOrganization(orgId: string, uid: string): Promise<void> {
  const membershipId = `${orgId}_${uid}`;
  const path = `memberships/${membershipId}`;
  try {
    await deleteDoc(doc(db, 'memberships', membershipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchWorkspaceProject(projectId: string): Promise<WorkspaceProject | null> {
  const path = `projects/${projectId}`;
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      projectId: String(d.projectId),
      ownerType: d.ownerType as ProjectOwnerType,
      ownerId: String(d.ownerId),
      name: String(d.name),
      module: d.module as ProjectModule,
      status: d.status as WorkspaceProjectStatus,
      summaryText: d.summaryText ? String(d.summaryText) : undefined,
      createdBy: String(d.createdBy),
      createdAt: tsToIso(d.createdAt),
      updatedAt: tsToIso(d.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function inviteMemberByEmail(
  org: Organization,
  email: string,
  role: Exclude<OrgRole, 'owner'>,
  invitedByUid: string
): Promise<Invitation> {
  const cleanEmail = email.trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  const invitationId = createSafeId('inv');
  const path = `invitations/${invitationId}`;

  try {
    await setDoc(doc(db, 'invitations', invitationId), {
      invitationId,
      orgId: org.orgId,
      orgName: org.name.slice(0, 100),
      email: cleanEmail,
      role,
      status: 'pending',
      invitedBy: invitedByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = new Date().toISOString();
    return {
      invitationId,
      orgId: org.orgId,
      orgName: org.name,
      email: cleanEmail,
      role,
      status: 'pending',
      invitedBy: invitedByUid,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function acceptInvitation(
  invitation: Invitation,
  user: UserProfile
): Promise<void> {
  const membershipId = `${invitation.orgId}_${user.uid}`;
  const path = `invitations/${invitation.invitationId}`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'invitations', invitation.invitationId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'memberships', membershipId), {
      membershipId,
      orgId: invitation.orgId,
      userId: user.uid,
      role: invitation.role,
      userEmail: user.email,
      userDisplayName: user.displayName,
      sourceInvitationId: invitation.invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const path = `invitations/${invitationId}`;
  try {
    await updateDoc(doc(db, 'invitations', invitationId), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateMemberRole(
  membershipId: string,
  role: Exclude<OrgRole, 'owner'>
): Promise<void> {
  const path = `memberships/${membershipId}`;
  try {
    await updateDoc(doc(db, 'memberships', membershipId), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeMember(membershipId: string): Promise<void> {
  const path = `memberships/${membershipId}`;
  try {
    await deleteDoc(doc(db, 'memberships', membershipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createWorkspaceProject(params: {
  ownerType: ProjectOwnerType;
  ownerId: string;
  name: string;
  module: ProjectModule;
  createdBy: string;
  initialCourtSpec?: CourtProject;
}): Promise<WorkspaceProject> {
  const cleanName = params.name.trim().slice(0, 140);
  if (!cleanName) {
    throw new Error('Project name cannot be empty.');
  }
  const projectId = params.initialCourtSpec?.id
    ? params.initialCourtSpec.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || createSafeId('proj')
    : createSafeId('proj');
  const path = `projects/${projectId}`;

  const summaryText =
    params.module === 'sports' && params.initialCourtSpec
      ? buildProjectSummaryText(params.initialCourtSpec)
      : params.module === 'house'
      ? 'Architectural House Container · Editor module upcoming'
      : params.module === 'furniture'
      ? 'Bespoke Furniture Container · Editor module upcoming'
      : 'Sports Ground Studio Facility';

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'projects', projectId), {
      projectId,
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      name: cleanName,
      module: params.module,
      status: 'active',
      summaryText,
      createdBy: params.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (params.module === 'sports' && params.initialCourtSpec) {
      batch.set(
        doc(db, 'projects', projectId, 'specs', 'current'),
        buildSportsSpecPayload(projectId, params.initialCourtSpec)
      );
    }

    await batch.commit();
    const now = new Date().toISOString();
    return {
      projectId,
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      name: cleanName,
      module: params.module,
      status: 'active',
      summaryText,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function renameWorkspaceProject(projectId: string, name: string): Promise<void> {
  const cleanName = name.trim().slice(0, 140);
  if (!cleanName) throw new Error('Project name cannot be empty.');
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      name: cleanName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setWorkspaceProjectStatus(
  projectId: string,
  status: WorkspaceProjectStatus
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWorkspaceProject(
  projectId: string,
  module: ProjectModule
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    if (module === 'sports') {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'projects', projectId, 'specs', 'current'));
      batch.delete(doc(db, 'projects', projectId));
      await batch.commit();
    } else {
      await deleteDoc(doc(db, 'projects', projectId));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadSportsProjectSpec(
  wsProject: WorkspaceProject
): Promise<CourtProject | null> {
  const path = `projects/${wsProject.projectId}/specs/current`;
  try {
    const snap = await getDoc(doc(db, 'projects', wsProject.projectId, 'specs', 'current'));
    if (!snap.exists()) return null;
    return hydrateCourtProjectFromSpec(wsProject, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSportsProjectSpec(
  courtProject: CourtProject,
  updateContainerMeta = true
): Promise<void> {
  const path = `projects/${courtProject.id}/specs/current`;
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'projects', courtProject.id, 'specs', 'current'),
      buildSportsSpecPayload(courtProject.id, courtProject)
    );
    if (updateContainerMeta) {
      batch.update(doc(db, 'projects', courtProject.id), {
        name: (courtProject.name || 'Untitled Facility').trim().slice(0, 140),
        summaryText: buildProjectSummaryText(courtProject),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
