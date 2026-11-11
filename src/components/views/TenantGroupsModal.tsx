import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3,
  ExternalLink, 
  Tag, 
  Mail, 
  X, 
  Check, 
  Copy, 
  Server,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { TenantGroup, RouterDevice } from '../../types';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';

interface TenantGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  routers: RouterDevice[];
  onGroupsUpdated?: () => void;
}

export const TenantGroupsModal: React.FC<TenantGroupsModalProps> = ({
  isOpen,
  onClose,
  routers,
  onGroupsUpdated
}) => {
  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>(() => storage.getTenantGroups());
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TenantGroup | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tag, setTag] = useState('client:');
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTenantGroups(storage.getTenantGroups());
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshGroups = () => {
    const fresh = storage.getTenantGroups();
    setTenantGroups([...fresh]);
    if (onGroupsUpdated) onGroupsUpdated();
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setName('');
    setTag('client:');
    setCustomBgUrl('');
    setClientContact('');
    setAccentColor('#3b82f6');
    setDescription('');
    setShowFormModal(true);
  };

  const openEditModal = (group: TenantGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setTag(group.tag);
    setCustomBgUrl(group.customBgUrl || '');
    setClientContact(group.clientContact || '');
    setAccentColor(group.accentColor || '#3b82f6');
    setDescription(group.description || '');
    setShowFormModal(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let cleanTag = tag.trim().toLowerCase();
    if (!cleanTag.startsWith('client:') && !cleanTag.startsWith('group:')) {
      cleanTag = `client:${cleanTag}`;
    }

    if (editingGroup) {
      storage.updateTenantGroup(editingGroup.id, {
        name: name.trim(),
        tag: cleanTag,
        customBgUrl: customBgUrl.trim() || '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29__1__283ff412.jpeg',
        clientContact: clientContact.trim() || undefined,
        accentColor,
        description: description.trim() || undefined
      });
    } else {
      storage.createTenantGroup({
        name: name.trim(),
        tag: cleanTag,
        customBgUrl: customBgUrl.trim() || '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29__1__283ff412.jpeg',
        clientContact: clientContact.trim() || undefined,
        accentColor,
        description: description.trim() || undefined
      });
    }

    setShowFormModal(false);
    setEditingGroup(null);
    refreshGroups();
  };

  const handleConfirmDeleteGroup = (groupId: string) => {
    storage.deleteTenantGroup(groupId);
    setConfirmDeleteId(null);
    refreshGroups();
  };

  const handleRestoreDefaults = () => {
    storage.resetStarterTenantGroups();
    refreshGroups();
  };

  const handleCopyTag = (t: string) => {
    copyToClipboard(t);
    setCopiedTag(t);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>External Client Groups (Tenant Brands)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Full CRUD Enabled
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Create, edit, or delete external partner/client groups and custom splash page branding
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span>{tenantGroups.length} External Tenant Brands Configured</span>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-2 py-1 bg-[#161d31] hover:bg-[#1f2942] border border-[#232d42] text-slate-300 hover:text-white rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Restore default Lesotho partner & lab groups if deleted"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Restore Starter Groups</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add External Client Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {tenantGroups.length === 0 ? (
            <div className="p-8 text-center border border-[#232d42] rounded-xl bg-[#141a29] space-y-3 font-mono">
              <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">No Client Groups Configured</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All external client groups have been removed. Add a new custom client group or restore the starter groups.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Create Client Group
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#1f2942] border border-[#232d42] text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Restore Starter Groups
                </button>
              </div>
            </div>
          ) : (
            tenantGroups.map((group) => {
              const assignedRouters = routers.filter(
                r => r.tenantGroupId === group.id || r.partnerName === group.name || (r.tags && r.tags.includes(group.tag))
              );
              const isConfirmingDelete = confirmDeleteId === group.id;

              return (
                <div 
                  key={group.id}
                  className="bg-[#141a29] border border-[#232d42] hover:border-slate-600 rounded-xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Small Background Thumbnail */}
                      <div 
                        className="w-14 h-14 rounded-lg bg-cover bg-center border border-white/20 shrink-0 relative overflow-hidden shadow-sm"
                        style={{ backgroundImage: `url(${group.customBgUrl})` }}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{group.name}</h4>
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: group.accentColor || '#3b82f6' }}
                            title={`Brand Accent: ${group.accentColor}`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">
                          {group.description || 'No description provided.'}
                        </p>
                        {group.clientContact && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{group.clientContact}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono flex-wrap">
                      {/* Policy Tag Pill */}
                      <button
                        type="button"
                        onClick={() => handleCopyTag(group.tag)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-black/40 hover:bg-black/60 border border-slate-700 rounded text-xs text-slate-300 font-bold transition-colors cursor-pointer"
                        title="Click to copy dynamic router tag"
                      >
                        <Tag className="w-3 h-3 text-[#f05e17]" />
                        <span>{group.tag}</span>
                        {copiedTag === group.tag ? (
                          <Check className="w-3 h-3 text-emerald-400 ml-1" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500 ml-1" />
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(group)}
                        className="px-2.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit Client Group"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Inline Two-Step Delete Confirmation (Zero Browser confirm() Blocking) */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/50 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-rose-200 font-bold mr-1">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteGroup(group.id)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(group.id)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Delete Client Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-bar: Assigned Routers & Custom Wallpaper Preview */}
                  <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-[#1b233a] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold">Assigned Routers:</span>
                      {assignedRouters.length > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          {assignedRouters.map(r => r.name).join(', ')} ({assignedRouters.length})
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None yet (tag any router with &quot;{group.tag}&quot;)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] truncate max-w-[200px]" title={group.customBgUrl}>
                        🖼️ {group.customBgUrl}
                      </span>
                      <a 
                        href={group.customBgUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#232d42] flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Changes sync immediately to Adoption Hub dropdowns and server partner groups.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-white font-bold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Create / Edit Tenant Group Sub-Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-[#0f1422] border border-blue-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>{editingGroup ? `Edit Client Group: ${editingGroup.name}` : 'Add External Client Group'}</span>
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Client / Brand Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingGroup && (tag === 'client:' || tag.startsWith('client:'))) {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 24);
                      setTag(`client:${slug}`);
                    }
                  }}
                  placeholder="e.g. Maluti Mountain Lodge"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-slate-300 block mb-1 font-bold">Router Policy Tag</label>
                  <input
                    type="text"
                    required
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="client:maluti-lodge"
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-emerald-400 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Brand Accent</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full h-9 bg-[#161d31] border border-[#232d42] rounded-lg cursor-pointer p-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">Custom Splash Background Image URL</label>
                <input
                  type="text"
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or /assets/..."
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-cyan-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">Client Contact Email</label>
                <input
                  type="email"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="ops@clientdomain.co.ls"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">Brand Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="External franchise notes, location details, contract tier..."
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#232d42]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-3 py-1.5 bg-[#161d31] text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingGroup ? 'Save Changes' : 'Create Client Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
