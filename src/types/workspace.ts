export type OrgRole = 'owner' | 'admin' | 'manager' | 'collaborator';

export type ProjectModule = 'sports' | 'house' | 'furniture';

export type WorkspaceProjectStatus = 'active' | 'archived';

export type ProjectOwnerType = 'user' | 'org';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  orgId: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  membershipId: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  userEmail: string;
  userDisplayName: string;
  sourceInvitationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  invitationId: string;
  orgId: string;
  orgName: string;
  email: string;
  role: Exclude<OrgRole, 'owner'>;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProject {
  projectId: string;
  ownerType: ProjectOwnerType;
  ownerId: string;
  name: string;
  module: ProjectModule;
  status: WorkspaceProjectStatus;
  summaryText?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveWorkspace =
  | {
      type: 'user';
      uid: string;
      label: string;
    }
  | {
      type: 'org';
      orgId: string;
      label: string;
      role: OrgRole;
    };

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  title: string;
  detail?: string;
}
