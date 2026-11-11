import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Check, 
  Copy, 
  AlertTriangle, 
  Plus, 
  Trash2,
  Edit3,
  RefreshCw,
  Lock
} from 'lucide-react';
import { ContentFilterRule, RouterDevice, VerticalType } from '../../types';
import { RouterOSRenderer } from '../../services/routerosRenderer';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';

interface BandwidthFilterViewProps {
  contentFilters: ContentFilterRule[];
  onToggleFilter: (ruleId: string, enabled: boolean) => void;
  routers: RouterDevice[];
  selectedVertical: VerticalType | 'all';
}

export const BandwidthFilterView: React.FC<BandwidthFilterViewProps> = ({
  contentFilters,
  onToggleFilter,
  routers,
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [copiedDnsScript, setCopiedDnsScript] = useState(false);
  const [copiedQosScript, setCopiedQosScript] = useState(false);

  // 3-Level Speed Caps State
  const [siteMaxDownMbps, setSiteMaxDownMbps] = useState<number>(50);
  const [siteMaxUpMbps, setSiteMaxUpMbps] = useState<number>(20);
  const [enableFairUse, setEnableFairUse] = useState<boolean>(true);
  const [fairUseLimitGb, setFairUseLimitGb] = useState<number>(5);
  const [throttleDownMbps] = useState<number>(1);

  // Content Filter Category CRUD State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<ContentFilterRule | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContentFilterRule['category']>('adult');
  const [filterDesc, setFilterDesc] = useState('');
  const [filterCount, setFilterCount] = useState<number>(10000);
  const [confirmDeleteFilterId, setConfirmDeleteFilterId] = useState<string | null>(null);

  // Persistent Custom Domain Override State
  const [customDomains, setCustomDomains] = useState<Array<{ id: string; domain: string; action: 'block' | 'allow' }>>(
    () => storage.getCustomDnsRules()
  );
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainAction, setNewDomainAction] = useState<'block' | 'allow'>('block');

  const refreshCustomDomains = () => {
    setCustomDomains([...storage.getCustomDnsRules()]);
  };

  const handleAddCustomDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    storage.addCustomDnsRule(newDomainInput.trim().toLowerCase(), newDomainAction);
    setNewDomainInput('');
    refreshCustomDomains();
  };

  const handleToggleCustomDomainAction = (id: string, currentAction: 'block' | 'allow') => {
    storage.updateCustomDnsRule(id, { action: currentAction === 'block' ? 'allow' : 'block' });
    refreshCustomDomains();
  };

  const handleRemoveCustomDomain = (id: string) => {
    storage.deleteCustomDnsRule(id);
    refreshCustomDomains();
  };

  const openCreateFilterModal = () => {
    setEditingFilter(null);
    setFilterName('');
    setFilterCategory('adult');
    setFilterDesc('');
    setFilterCount(10000);
    setShowFilterModal(true);
  };

  const openEditFilterModal = (rule: ContentFilterRule) => {
    setEditingFilter(rule);
    setFilterName(rule.name);
    setFilterCategory(rule.category);
    setFilterDesc(rule.description);
    setFilterCount(rule.blockedDomainsCount);
    setShowFilterModal(true);
  };

  const handleSaveFilterRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) return;
    if (editingFilter) {
      storage.updateContentFilter(editingFilter.id, {
        name: filterName.trim(),
        category: filterCategory,
        description: filterDesc.trim(),
        blockedDomainsCount: Number(filterCount) || 0
      });
    } else {
      storage.createContentFilter({
        name: filterName.trim(),
        category: filterCategory,
        description: filterDesc.trim() || 'Custom DNS sinkhole category',
        blockedDomainsCount: Number(filterCount) || 1000,
        enabled: true,
        siteId: 'all'
      });
    }
    setShowFilterModal(false);
    setEditingFilter(null);
  };

  const sampleBlockedDomains = [
    'malware-domain-sample.com',
    'phishing-verify-account.net',
    'gambling-online-bet.org',
    'torrent-tracker-live.biz'
  ];

  const generatedDnsScript = RouterOSRenderer.renderDnsBlocklist('Active-Shield', [
    ...sampleBlockedDomains,
    ...customDomains.filter(d => d.action === 'block').map(d => d.domain)
  ]);

  const generatedQosScript = `# ============================================================
# T-Connect 3-Level Bandwidth & FQ-CoDel Fair-Use Profile
# Target Site: ${selectedSiteId.toUpperCase()}
# ============================================================
/queue type
add name="tc-cake-down" kind=cake cake-diffserv=diffserv4 cake-flowmode=triple-isolate
add name="tc-cake-up" kind=cake cake-diffserv=diffserv4 cake-flowmode=triple-isolate

/queue simple
:do { remove [find name="tc-site-aggregate"] } on-error={}
add name="tc-site-aggregate" target="10.99.0.0/16" max-limit="${siteMaxUpMbps}M/${siteMaxDownMbps}M" queue="tc-cake-up/tc-cake-down" comment="T-Connect Site Cap"
${enableFairUse ? `add name="tc-fair-use-burst" parent="tc-site-aggregate" target="10.99.0.0/16" burst-limit="${siteMaxDownMbps * 1.5}M" burst-threshold="${siteMaxDownMbps}M" burst-time=15s comment="T-Connect Anti-Hogging Burst"` : ''}
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Bandwidth QoS &amp; DNS Content Filtering</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            3-level speed throttling (Plan, Site, Device) + local RouterOS DNS sinkhole with anti-DoH bypass
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Target Location:</span>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
          >
            <option value="all">All Fleet Locations</option>
            {routers.map((r) => (
              <option key={r.id} value={r.id}>{r.siteName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-Level Speed Caps Section */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#f05e17]" />
            <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
              3-LEVEL BANDWIDTH &amp; FAIR-USE MANAGEMENT
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">FQ-CoDel Bufferbloat Defense</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Level 1: Plan Speed Cap */}
          <div className="p-4 bg-[#161d31] rounded-xl border border-[#232d42] space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">LEVEL 1: PER-PLAN RATE LIMIT</span>
            <h3 className="font-bold text-white text-sm">FreeRADIUS Mikrotik-Rate-Limit</h3>
            <p className="text-[11px] text-slate-400">
              Injected directly via RADIUS Access-Accept attribute `4096k/2048k` for each client voucher.
            </p>
            <div className="text-emerald-400 font-bold pt-1 text-[11px]">Strict User Limit: Active</div>
          </div>

          {/* Level 2: Site Default Aggregate */}
          <div className="p-4 bg-[#161d31] rounded-xl border border-[#232d42] space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">LEVEL 2: SITE AGGREGATE CAP</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Site Max Down</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={siteMaxDownMbps}
                    onChange={(e) => setSiteMaxDownMbps(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-[#0b0f19] border border-[#232d42] rounded text-white font-mono"
                  />
                  <span className="text-slate-400">Mbps</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Site Max Up</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={siteMaxUpMbps}
                    onChange={(e) => setSiteMaxUpMbps(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-[#0b0f19] border border-[#232d42] rounded text-white font-mono"
                  />
                  <span className="text-slate-400">Mbps</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Shared fairly using CAKE/FQ-CoDel queue trees.</p>
          </div>

          {/* Level 3: Fair-Use Throttling */}
          <div className="p-4 bg-[#161d31] rounded-xl border border-[#232d42] space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">LEVEL 3: FAIR-USE ANTI-HOGGING</span>
            <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
              <input
                type="checkbox"
                checked={enableFairUse}
                onChange={(e) => setEnableFairUse(e.target.checked)}
                className="rounded accent-[#f05e17] w-3.5 h-3.5"
              />
              <span>Enable Fair-Use Throttling</span>
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Throttle after:</span>
              <input
                type="number"
                value={fairUseLimitGb}
                onChange={(e) => setFairUseLimitGb(Number(e.target.value))}
                className="w-12 px-1 py-0.5 bg-[#0b0f19] border border-[#232d42] rounded text-white text-center font-mono"
              />
              <span>GB to {throttleDownMbps} Mbps</span>
            </div>
          </div>
        </div>

        {/* Copy QoS Script */}
        <div className="flex justify-end pt-2 border-t border-[#232d42]">
          <button
            onClick={() => {
              copyToClipboard(generatedQosScript);
              setCopiedQosScript(true);
              setTimeout(() => setCopiedQosScript(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded-lg text-xs font-mono text-slate-200 cursor-pointer"
          >
            {copiedQosScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedQosScript ? 'Copied QoS Script' : 'Copy RouterOS Queue Script'}</span>
          </button>
        </div>
      </div>

      {/* Content Filter Categories & Custom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Toggles */}
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
                DNS-LEVEL CONTENT FILTER CATEGORIES
              </h2>
            </div>
            <button
              type="button"
              onClick={openCreateFilterModal}
              className="px-2.5 py-1 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="space-y-3">
            {contentFilters.map((filter) => (
              <div
                key={filter.id}
                className="p-3 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white">{filter.name}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                      {filter.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{filter.description}</p>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    {filter.blockedDomainsCount.toLocaleString()} known hostnames blocked
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditFilterModal(filter)}
                    className="p-1 text-slate-400 hover:text-cyan-400 rounded cursor-pointer"
                    title="Edit Filter Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {confirmDeleteFilterId === filter.id ? (
                    <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded px-1.5 py-0.5 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          storage.deleteContentFilter(filter.id);
                          setConfirmDeleteFilterId(null);
                        }}
                        className="text-rose-300 font-bold hover:text-white cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteFilterId(null)}
                        className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFilterId(filter.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                      title="Delete Filter Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={filter.enabled}
                      onChange={(e) => onToggleFilter(filter.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#232d42] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f05e17]"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Honest Technical Limitation Note as Required */}
          <div className="p-3 bg-[#121929] rounded-lg border border-[#1e273d] flex items-start gap-2.5 text-xs font-mono text-slate-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Engineering Transparency:</strong> DNS sinkholing intercepts standard UDP/TCP port 53 and blocks well-known DoH resolvers (Cloudflare, Google). However, custom encrypted DoH clients hardcoding non-standard endpoints cannot be 100% intercepted without client root CA interception.
            </p>
          </div>
        </div>

        {/* Custom Whitelist / Blacklist Overrides */}
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
                CUSTOM DOMAIN OVERRIDES ({customDomains.length})
              </h2>
            </div>
            <button
              onClick={() => {
                copyToClipboard(generatedDnsScript);
                setCopiedDnsScript(true);
                setTimeout(() => setCopiedDnsScript(false), 2000);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] font-mono text-slate-300 cursor-pointer"
            >
              {copiedDnsScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDnsScript ? 'Copied' : 'Export Script'}</span>
            </button>
          </div>

          {/* Add Override Form */}
          <form onSubmit={handleAddCustomDomain} className="flex gap-2 text-xs font-mono">
            <input
              type="text"
              required
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              placeholder="e.g. gambling-site.com"
              className="flex-1 px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
            />
            <select
              value={newDomainAction}
              onChange={(e) => setNewDomainAction(e.target.value as 'block' | 'allow')}
              className="px-2 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono cursor-pointer"
            >
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Domain List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {customDomains.map((dom) => (
              <div
                key={dom.id}
                className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dom.action === 'block' ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                  <span className="text-white font-semibold">{dom.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCustomDomainAction(dom.id, dom.action)}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      dom.action === 'block'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                    title="Click to toggle Block / Allow"
                  >
                    {dom.action}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomDomain(dom.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    title="Delete custom domain rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Content Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-sm font-extrabold text-white">
                {editingFilter ? `Edit Filter Category: ${editingFilter.name}` : 'Add Content Filter Category'}
              </h3>
              <button onClick={() => setShowFilterModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveFilterRule} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="e.g. Social Media Streaming"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category Type</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as ContentFilterRule['category'])}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  >
                    <option value="adult">Adult</option>
                    <option value="gambling">Gambling</option>
                    <option value="malware">Malware</option>
                    <option value="piracy">Piracy / Torrents</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hostname Count</label>
                  <input
                    type="number"
                    min="1"
                    value={filterCount}
                    onChange={(e) => setFilterCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={filterDesc}
                  onChange={(e) => setFilterDesc(e.target.value)}
                  placeholder="Describe what domains this DNS category blocks..."
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-3 py-1.5 bg-[#161d31] text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg cursor-pointer"
                >
                  {editingFilter ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
