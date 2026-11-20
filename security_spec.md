# Security Specification — My3D Studio (Core Workspace & Multi-Module Specs)

## 1. Data Invariants
1. **User PII Isolation**: `/users/{uid}` contains `email` and is readable/writable strictly by `request.auth.uid == uid` with verified email (`email_verified == true`).
2. **Atomic Org Ownership**: Creating `/organizations/{orgId}` requires `ownerId == request.auth.uid` and an atomic `memberships/{orgId}_{uid}` document with `role == 'owner'` verified via `existsAfter`.
3. **Deterministic Membership Key**: `/memberships/{membershipId}` MUST use `membershipId == orgId + '_' + userId` so O(1) `get()`/`exists()` checks enforce RBAC synchronously.
4. **Role Escalation Prevention**: Only `owner` or `admin` of `orgId` can invite members, change non-owner roles, or remove non-owner members. Self-joining via `/memberships` is forbidden unless backed by an atomic pending `/invitations/{sourceInvitationId}` update (`status: 'pending' -> 'accepted'`) matching `request.auth.token.email.lower()`.
5. **Project Workspace Scoping**: `/projects/{projectId}` is readable/writable ONLY by `ownerId == request.auth.uid` (when `ownerType == 'user'`) or a verified member of `ownerId` (when `ownerType == 'org'`). Deleting projects requires personal ownership or `owner`/`admin`/`manager` role in the owning org.
6. **Subcollection Master Gate & Module Lock**: `/projects/{projectId}/specs/{specId}` derives access strictly from the parent `/projects/{projectId}` document and enforces schema validation matched to the parent project's `module` (`sports`, `furniture`, or `house`).
7. **Server Timestamps & Strict Key Allowlists**: Every `create` and `update` enforces `createdAt == request.time` / `updatedAt == request.time`, immutable ownership keys, string `.size()` bounds, and exact key allowlists (`hasAll`/`hasOnly` on create, `affectedKeys().hasOnly(...)` on update).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Shadow Field Injection on User**: `setDoc('/users/u1', { ..., isAdmin: true })` -> Denied by `hasOnly(...)`.
2. **Reading Another User's PII**: `getDoc('/users/u2')` as `u1` -> Denied by `uid == request.auth.uid`.
3. **Unverified Email Write**: Any write where `request.auth.token.email_verified == false` -> Denied by `isVerifiedUser()`.
4. **Orphan Organization Creation**: Creating `/organizations/org1` without batch-creating `/memberships/org1_u1` -> Denied by `existsAfter(...)`.
5. **Self-Membership Privilege Escalation**: `setDoc('/memberships/org1_attacker', { orgId: 'org1', userId: 'attacker', role: 'owner' })` without owner permission or pending invitation -> Denied.
6. **Invitation Email Spoofing**: Accepting `/invitations/inv1` (`email: 'alice@example.com'`) while signed in as `bob@example.com` -> Denied by `email.lower() == request.auth.token.email.lower()`.
7. **Non-Admin Member Invite**: `collaborator` or `manager` creating `/invitations/inv2` -> Denied by `isOrgAdminOrOwner(orgId)`.
8. **Demoting Organization Owner**: `admin` updating owner's membership role or deleting owner's membership -> Denied.
9. **Cross-Workspace Project Read**: Reading `/projects/p_org2` (`ownerType: 'org', ownerId: 'org2'`) by non-member `u1` -> Denied.
10. **Project Owner Mutation (Theft)**: Updating `ownerId` or `ownerType` on `/projects/p1` -> Denied by immutability check + `affectedKeys().hasOnly(...)`.
11. **Oversized ID Poisoning**: Creating `/projects/` + 500-char ID or 5000-char `name` -> Denied by `isValidId()` and `.size()` bounds.
12. **Client-Forged Timestamp**: Setting `createdAt: new Date(0)` instead of `serverTimestamp()` -> Denied by `createdAt == request.time`.
