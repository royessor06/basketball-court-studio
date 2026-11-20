import React, { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Building2,
  Check,
  Home,
  Pencil,
  RotateCcw,
  Sofa,
  Trash2,
} from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { STUDIO_MODULES } from '../core/studioModules';
import { useAuthWorkspace } from '../store/useAuthWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';

export const ContainerProjectView: React.FC = () => {
  const { activeContainerProject, setCurrentView } = useProjectStore();
  const { activeWorkspace, renameProject, archiveProject, restoreProject, removeProject } =
    useAuthWorkspace();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!activeContainerProject) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-[#9AA4B2] mb-4">
            Select a project from the Workspace Hub to inspect its container details.
          </p>
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md cursor-pointer"
          >
            Back to Workspace Hub
          </button>
        </div>
      </div>
    );
  }

  const isHouse = activeContainerProject.module === 'house';
  const Icon = isHouse ? Home : Sofa;
  const moduleDef = STUDIO_MODULES[activeContainerProject.module];
  const moduleLabel = moduleDef.name;

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) return;
    const ok = await renameProject(activeContainerProject.projectId, draftName);
    if (ok) setEditingName(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <button
          type="button"
          onClick={() => setCurrentView('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace Hub
        </button>

        <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#202630] border border-white/10 flex items-center justify-center text-[#1686C9] shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA4B2] mb-1">
                  <span className="font-mono-tech uppercase tracking-wider text-[#1686C9]">
                    {moduleLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {activeWorkspace?.label ?? 'Workspace'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">
                    Status: {activeContainerProject.status}
                  </span>
                </div>

                {editingName ? (
                  <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={140}
                      autoFocus
                      className="px-3 py-1.5 bg-[#111318] border border-[#1686C9] rounded text-sm text-[#F2F4F7] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#1686C9] text-white text-xs font-medium rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-2.5 py-1.5 bg-[#202630] text-xs text-[#9AA4B2] rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <h1 className="font-display text-2xl font-bold text-[#F2F4F7]">
                    {activeContainerProject.name}
                  </h1>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftName(activeContainerProject.name);
                  setEditingName(true);
                }}
                className="px-3 py-2 bg-[#202630] hover:bg-white/10 border border-white/10 rounded text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#1686C9]" />
                Rename
              </button>

              {activeContainerProject.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => void archiveProject(activeContainerProject.projectId)}
                  className="px-3 py-2 bg-[#202630] hover:bg-white/10 border border-white/10 rounded text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-[#F07827]" />
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void restoreProject(activeContainerProject.projectId)}
                  className="px-3 py-2 bg-[#202630] hover:bg-white/10 border border-white/10 rounded text-xs font-medium text-[#4CC38A] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              )}

              {confirmDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    await removeProject(
                      activeContainerProject.projectId,
                      activeContainerProject.module
                    );
                    setCurrentView('dashboard');
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 bg-[#202630] hover:bg-red-500/20 border border-red-500/25 rounded text-xs font-medium text-red-400 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="p-5 bg-[#111318] border border-white/10 rounded-lg space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                {moduleLabel} Container Provisioned
              </h2>
              <p className="text-xs text-[#9AA4B2] leading-relaxed mt-1">
                {moduleDef.description} Persisted in Cloud Firestore under your active workspace (
                <span className="font-mono-tech text-[#F2F4F7]">
                  {activeContainerProject.ownerType}:{activeContainerProject.ownerId}
                </span>
                ) with full RBAC permissions and multi-module spec validation.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[#9AA4B2] mb-2">
                Planned {moduleLabel} Capabilities (My3D Studio Core)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {moduleDef.capabilities.map((cap) => (
                  <div
                    key={cap}
                    className="px-3 py-2 bg-[#1A2029] border border-white/8 rounded text-xs text-[#F2F4F7] flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-[#4CC38A] shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#111318] border border-white/10 rounded-md">
              <div className="text-[#9AA4B2]">Project ID</div>
              <div className="font-mono-tech text-[#F2F4F7] mt-1 break-all">
                {activeContainerProject.projectId}
              </div>
            </div>
            <div className="p-4 bg-[#111318] border border-white/10 rounded-md">
              <div className="text-[#9AA4B2]">Module</div>
              <div className="font-mono-tech text-[#F2F4F7] mt-1 capitalize">
                {activeContainerProject.module}
              </div>
            </div>
            <div className="p-4 bg-[#111318] border border-white/10 rounded-md">
              <div className="text-[#9AA4B2]">Created</div>
              <div className="font-mono-tech text-[#F2F4F7] mt-1">
                {new Date(activeContainerProject.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
