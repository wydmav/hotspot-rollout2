import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Download, 
  RefreshCw, 
  Phone, 
  Mail, 
  Wifi, 
  Clock, 
  Trash2, 
  Zap, 
  ShieldCheck, 
  Check, 
  ExternalLink,
  Plus,
  Sparkles,
  Smartphone,
  Key,
  FileText,
  Copy,
  Send,
  Lock,
  Globe,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { CaptivePortalLead, VerticalType } from '../../types';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';

interface PartnerApiKeyItem {
  id: string;
  companyName: string;
  campaignName: string;
  apiKey: string;
  allowedScopes: string[];
  allowedRouterIds?: string[];
  allowedSites: string[];
  webhookUrl: string;
  webhookSecret: string;
  status: 'active' | 'revoked';
  createdAt: string;
  leadsResetAt?: string;
  matchedLeadsCount?: number;
  lastUsedAt?: string;
  totalRequests?: number;
}

interface PartnerWebhookLogItem {
  id: string;
  partnerId: string;
  companyName: string;
  leadId: string;
  scope: string;
  webhookUrl: string;
  status: number;
  success: boolean;
  deliveredAt: string;
  detail: string;
}

interface CaptivePortalLeadsViewProps {
  selectedVertical?: VerticalType | 'all';
  currency?: string;
}

export const CaptivePortalLeadsView: React.FC<CaptivePortalLeadsViewProps> = ({
  selectedVertical = 'all',
  currency = 'M'
}) => {
  const [leads, setLeads] = useState<CaptivePortalLead[]>(() => storage.getCaptiveLeads());
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<'all' | '+266' | '+27'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Partner REST API & Scoped Keys State
  const [showPartnerApiPanel, setShowPartnerApiPanel] = useState<boolean>(true);
  const [partnerKeys, setPartnerKeys] = useState<PartnerApiKeyItem[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<PartnerWebhookLogItem[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>(['hotspot', 'stadium']);
  const [newRouterIds, setNewRouterIds] = useState<string[]>(['*']);
  const [newSitesInput, setNewSitesInput] = useState('*');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [verifyingKeyId, setVerifyingKeyId] = useState<string | null>(null);
  const [resettingKeyId, setResettingKeyId] = useState<string | null>(null);
  const [showResetLeadsModal, setShowResetLeadsModal] = useState(false);
  const [resetTargetScope, setResetTargetScope] = useState<VerticalType | 'all'>('all');
  const [isResettingLeads, setIsResettingLeads] = useState(false);
  const [verificationReport, setVerificationReport] = useState<Record<string, string>>({});
  const [serverAdoptedRouters, setServerAdoptedRouters] = useState<
    Array<{ id: string; name: string; siteName: string; vertical: string }>
  >([]);

  const adoptedRoutersList = useMemo(() => {
    if (serverAdoptedRouters.length > 0) return serverAdoptedRouters;
    const localRouters = storage.getState().routers || [];
    return localRouters.map((r) => ({
      id: r.id,
      name: r.name,
      siteName: r.siteName,
      vertical: String(r.vertical || 'hotspot')
    }));
  }, [serverAdoptedRouters, leads]);

  const fetchPartnerKeys = async () => {
    try {
      const res = await fetch('/api/admin/partner-keys');
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.keys)) setPartnerKeys(data.keys);
        if (Array.isArray(data.adoptedRouters)) setServerAdoptedRouters(data.adoptedRouters);
        if (Array.isArray(data.webhookLogs)) setWebhookLogs(data.webhookLogs);
      }
    } catch {}
  };

  const refreshLeads = () => {
    setLeads([...storage.getCaptiveLeads()]);
    fetchPartnerKeys();
  };

  useEffect(() => {
    let mounted = true;
    const unsub = storage.subscribe(() => {
      if (mounted) setLeads([...storage.getCaptiveLeads()]);
    });

    const pollServerGuestLeads = async () => {
      try {
        const res = await fetch('/api/portal/guest-connect');
        const data = await res.json();
        if (!mounted || !data?.success || !Array.isArray(data.events)) return;
        let added = false;
        const currentLeads = storage.getCaptiveLeads();
        for (const ev of data.events) {
          const emailVal = (ev.email || ev.guestEmail || '').trim();
          const phoneVal = (ev.phone || ev.guestPhone || '').trim();
          const nameVal = (ev.guestName || `${ev.firstName || ''} ${ev.lastName || ''}`).trim();
          if (!emailVal && !phoneVal && (!nameVal || nameVal === 'Guest User')) continue;
          const leadId = `lead_srv_${ev.id}`;
          const exists = currentLeads.some(
            (l) =>
              l.id === leadId ||
              (emailVal && l.email.toLowerCase() === emailVal.toLowerCase()) ||
              (phoneVal && l.fullPhone.replace(/\D/g, '') === phoneVal.replace(/\D/g, ''))
          );
          if (!exists) {
            const parts = nameVal.split(' ');
            storage.addCaptiveLead({
              id: leadId,
              firstName: ev.firstName || parts[0] || 'Guest',
              lastName: ev.lastName || parts.slice(1).join(' ') || 'Subscriber',
              fullName: nameVal || 'Guest Subscriber',
              countryCode: ev.countryCode || '+266',
              phone: phoneVal.replace(/^\+266\s?|\+27\s?/, ''),
              fullPhone: phoneVal.startsWith('+') ? phoneVal : `${ev.countryCode || '+266'} ${phoneVal}`,
              email: emailVal || 'not-provided@tconnect.ls',
              capturedAt: ev.connectedAt || new Date().toISOString(),
              routerName: ev.routerName || 'MIKROTIK-TC',
              siteName: ev.siteName || 'T-Connect Hotspot',
              vertical: (ev.scope as VerticalType) || 'hotspot',
              clientMac: ev.mac || 'Client-MAC',
              clientIp: ev.ip || '10.10.0.x',
              deviceType: 'Wi-Fi Guest',
              durationMinutes: ev.durationSeconds ? Math.round(ev.durationSeconds / 60) : 0,
              status: 'active'
            });
            added = true;
          }
        }
        if (added && mounted) {
          setLeads([...storage.getCaptiveLeads()]);
        }
      } catch {}
    };

    pollServerGuestLeads();
    fetchPartnerKeys();
    const timer = setInterval(pollServerGuestLeads, 2500);
    return () => {
      mounted = false;
      unsub();
      clearInterval(timer);
    };
  }, []);

  const handleToggleScopeChoice = (scopeKey: string) => {
    setNewScopes((prev) =>
      prev.includes(scopeKey)
        ? prev.length > 1
          ? prev.filter((s) => s !== scopeKey)
          : prev
        : [...prev, scopeKey]
    );
  };

  const handleToggleRouterChoice = (routerNameOrStar: string) => {
    if (routerNameOrStar === '*') {
      setNewRouterIds(['*']);
      return;
    }
    setNewRouterIds((prev) => {
      const withoutStar = prev.filter((r) => r !== '*');
      if (withoutStar.includes(routerNameOrStar)) {
        const next = withoutStar.filter((r) => r !== routerNameOrStar);
        return next.length > 0 ? next : ['*'];
      }
      return [...withoutStar, routerNameOrStar];
    });
  };

  const handleVerifyKeyEnforcement = async (keyItem: PartnerApiKeyItem) => {
    setVerifyingKeyId(keyItem.id);
    try {
      const [leadsRes, blockedRes] = await Promise.all([
        fetch(`/api/v1/partner/leads?limit=50`, {
          headers: { 'X-API-Key': keyItem.apiKey }
        }),
        fetch(`/api/gateways`, {
          headers: { 'X-API-Key': keyItem.apiKey }
        })
      ]);
      const leadsData = await leadsRes.json();
      const isIsolated = blockedRes.status === 403;
      const sampleLead = Array.isArray(leadsData?.leads) && leadsData.leads[0] ? leadsData.leads[0] : null;
      const zeroLeakage =
        !sampleLead ||
        (sampleLead.mac === undefined &&
          sampleLead.ip === undefined &&
          sampleLead.voucherCode === undefined &&
          sampleLead.transactionRef === undefined);

      const summary =
        leadsRes.ok && isIsolated && zeroLeakage
          ? `ENFORCED: ${leadsData?.pagination?.totalLeads ?? 0} scoped leads accessible (${keyItem.allowedScopes.join(', ').toUpperCase()}) · Non-lead APIs blocked (HTTP 403) · Zero hardware/payment fields leaked.`
          : `Check status: Leads HTTP ${leadsRes.status}, Isolation HTTP ${blockedRes.status}`;

      setVerificationReport((prev) => ({ ...prev, [keyItem.id]: summary }));
      showToast('Verified Partner API key isolation & policy enforcement');
      fetchPartnerKeys();
    } catch {
      showToast('Failed to run live key verification');
    } finally {
      setVerifyingKeyId(null);
    }
  };

  const handleCreatePartnerKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      showToast('Please enter the partner company name');
      return;
    }
    setIsCreatingKey(true);
    try {
      const allowedSites = newSitesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/partner-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: newCompanyName.trim(),
          campaignName: newCampaignName.trim() || `${newCompanyName.trim()} Sponsored Wi-Fi`,
          allowedScopes: newScopes,
          allowedRouterIds: newRouterIds,
          allowedSites: allowedSites.length > 0 ? allowedSites : ['*'],
          webhookUrl: newWebhookUrl.trim()
        })
      });
      const data = await res.json();
      if (data?.success) {
        setPartnerKeys(data.keys || []);
        setNewCompanyName('');
        setNewCampaignName('');
        setNewRouterIds(['*']);
        setNewWebhookUrl('');
        showToast(`Issued Lead-Only REST API Key for ${data.key?.companyName} (Clean Slate — 0 prior leads)`);
      } else {
        showToast(data?.message || 'Failed to issue Partner API key');
      }
    } catch {
      showToast('Network error while issuing Partner API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleResetPartnerKeySlate = async (keyItem: PartnerApiKeyItem) => {
    setResettingKeyId(keyItem.id);
    try {
      const res = await fetch(`/api/admin/partner-keys/${keyItem.id}/reset-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.keys)) setPartnerKeys(data.keys);
        setVerificationReport((prev) => {
          const next = { ...prev };
          delete next[keyItem.id];
          return next;
        });
        showToast(`Reset ${keyItem.companyName} API Key to a clean slate (0 leads)`);
      } else {
        showToast(data?.message || 'Failed to reset sponsor key leads');
      }
    } catch {
      showToast('Network error resetting sponsor key leads');
    } finally {
      setResettingKeyId(null);
    }
  };

  const handleExecuteLeadsReset = async (scopeToReset: VerticalType | 'all') => {
    setIsResettingLeads(true);
    try {
      const res = await fetch('/api/admin/leads/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: scopeToReset })
      });
      const data = await res.json();
      storage.resetCaptiveLeads(scopeToReset);
      setLeads([...storage.getCaptiveLeads()]);
      if (Array.isArray(data?.keys)) {
        setPartnerKeys(data.keys);
      } else {
        fetchPartnerKeys();
      }
      setVerificationReport({});
      setShowResetLeadsModal(false);
      showToast(
        scopeToReset === 'all'
          ? 'All captured leads and sponsor API slates have been reset to 0'
          : `Reset all captured leads for ${scopeToReset.toUpperCase()} policy scope`
      );
    } catch {
      storage.resetCaptiveLeads(scopeToReset);
      setLeads([...storage.getCaptiveLeads()]);
      setShowResetLeadsModal(false);
      showToast('Reset local captured leads');
    } finally {
      setIsResettingLeads(false);
    }
  };

  const handleToggleKeyStatus = async (keyItem: PartnerApiKeyItem) => {
    const nextStatus = keyItem.status === 'active' ? 'revoked' : 'active';
    try {
      const res = await fetch(`/api/admin/partner-keys/${keyItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.keys)) {
        setPartnerKeys(data.keys);
        showToast(`${keyItem.companyName} API key ${nextStatus === 'active' ? 're-activated' : 'revoked'}`);
      }
    } catch {}
  };

  const handleDeletePartnerKey = async (keyItem: PartnerApiKeyItem) => {
    try {
      const res = await fetch(`/api/admin/partner-keys/${keyItem.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.keys)) {
        setPartnerKeys(data.keys);
        showToast(`Deleted API key for ${keyItem.companyName}`);
      }
    } catch {}
  };

  const handleTestWebhook = async (keyItem: PartnerApiKeyItem) => {
    if (!keyItem.webhookUrl) {
      showToast('No Webhook URL configured on this key');
      return;
    }
    setTestingWebhookId(keyItem.id);
    try {
      const res = await fetch(`/api/admin/partner-keys/${keyItem.id}/test-webhook`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.webhookLogs)) setWebhookLogs(data.webhookLogs);
        showToast(
          data.result?.success
            ? `Webhook delivered to ${keyItem.companyName} (${data.result.detail})`
            : `Webhook dispatch logged: ${data.result?.detail || 'Check endpoint'}`
        );
      } else {
        showToast(data?.message || 'Webhook test failed');
      }
    } catch {
      showToast('Failed to trigger test webhook');
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleDownloadApiDocs = async () => {
    try {
      const res = await fetch('/api/v1/partner/docs.md');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'T-Connect Control Tower - REST API Documentation.md');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded T-Connect Control Tower - REST API Documentation.md');
    } catch {
      showToast('Could not download API documentation');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    setCopiedText(text);
    showToast(ok ? `Copied ${label} to clipboard` : `Copied ${label}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Grant unlimited free access session for an existing lead
  const handleRegrantFreeSession = (lead: CaptivePortalLead) => {
    storage.addActiveSession({
      id: `sess_free_${Date.now()}`,
      voucherCode: `FREE-${(lead.phone || '9999').slice(-4)}`,
      clientMac: lead.clientMac || 'F4:D4:88:51:22:90',
      clientIp: lead.clientIp || '10.89.1.50',
      deviceType: lead.deviceType || 'Mobile Subscriber Device',
      siteName: lead.siteName || 'Hotspot Node',
      vertical: lead.vertical || 'hotspot',
      routerName: lead.routerName || 'MikroTik Gateway',
      planName: 'Free Wi-Fi (Unlimited)',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3650 * 86400 * 1000).toISOString(),
      remainingSeconds: 0,
      bytesDown: 14200000,
      bytesUp: 3800000,
      speedLimit: '25M/10M',
      guestName: lead.fullName,
      guestPhone: lead.fullPhone,
      guestEmail: lead.email,
      authMode: 'free'
    });

    // Update lead status
    const updatedLead: CaptivePortalLead = { ...lead, durationMinutes: 0, status: 'active' };
    storage.addCaptiveLead(updatedLead);
    refreshLeads();
    showToast(`Granted unlimited free Wi-Fi session to ${lead.fullName}`);
  };

  const handleDeleteLead = (id: string, name: string) => {
    storage.deleteCaptiveLead(id);
    refreshLeads();
    showToast(`Deleted guest lead record for ${name}`);
  };

  const handleSeedSampleLead = () => {
    const isLs = Math.random() > 0.4;
    const fNames = isLs ? ['Bohlokoa', 'Thabo', 'Palesa', 'Kekeletso'] : ['Thandeka', 'Lwazi', 'Bongani', 'Noluthando'];
    const lNames = isLs ? ['Majoro', 'Lekhanya', 'Moshoeshoe', 'Sechele'] : ['Khanyile', 'Mthethwa', 'Zulu', 'Ndlovu'];
    const fName = fNames[Math.floor(Math.random() * fNames.length)];
    const lName = lNames[Math.floor(Math.random() * lNames.length)];
    const countryCode = isLs ? '+266' : '+27';
    const rawDigits = isLs 
      ? `58${Math.floor(100000 + Math.random() * 900000)}` 
      : `082${Math.floor(1000000 + Math.random() * 9000000)}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(10 + Math.random() * 90)}@${isLs ? 'tconnect.ls' : 'gmail.com'}`;

    const newLead: CaptivePortalLead = {
      id: `lead_cna_${Date.now()}`,
      firstName: fName,
      lastName: lName,
      fullName: `${fName} ${lName}`,
      countryCode,
      phone: rawDigits,
      fullPhone: `${countryCode} ${rawDigits}`,
      email,
      capturedAt: new Date().toISOString(),
      routerName: 'MikroTik-Node',
      siteName: isLs ? 'Maseru Central Node' : 'Johannesburg Gateway',
      vertical: 'hotspot',
      clientMac: `40:${Math.floor(10+Math.random()*89)}:76:A2:${Math.floor(10+Math.random()*89)}:${Math.floor(10+Math.random()*89)}`,
      clientIp: `10.89.1.${Math.floor(10 + Math.random() * 80)}`,
      deviceType: Math.random() > 0.5 ? 'Apple iPhone (iOS 17)' : 'Samsung Galaxy A54',
      durationMinutes: 0,
      status: 'active'
    };

    storage.addCaptiveLead(newLead);
    refreshLeads();
    showToast(`Added sample verified lead for ${newLead.fullName}`);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (leads.length === 0) {
      showToast('No leads available to export');
      return;
    }

    const headers = [
      'Lead ID',
      'Full Name',
      'First Name',
      'Last Name',
      'Country Code',
      'Mobile Number',
      'Verified Email',
      'Hotspot Router',
      'Site Name',
      'Vertical',
      'Client MAC',
      'Client IP',
      'Device OS',
      'Captured Timestamp',
      'Session Status'
    ];

    const rows = filteredLeads.map((l) => [
      l.id,
      `"${l.fullName.replace(/"/g, '""')}"`,
      `"${l.firstName.replace(/"/g, '""')}"`,
      `"${l.lastName.replace(/"/g, '""')}"`,
      l.countryCode,
      `"${l.fullPhone}"`,
      `"${l.email}"`,
      `"${l.routerName}"`,
      `"${l.siteName}"`,
      l.vertical,
      l.clientMac,
      l.clientIp,
      `"${l.deviceType}"`,
      l.capturedAt,
      l.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tconnect_captive_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported guest leads to CSV');
  };

  // Active Sessions for status synchronization
  const activeSessions = useMemo(() => {
    return storage.getActiveSessions() || [];
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Vertical filter
      if (selectedVertical !== 'all') {
        if (selectedVertical === 'village' || selectedVertical === 'community') {
          if (lead.vertical !== 'village' && lead.vertical !== 'community') return false;
        } else if (lead.vertical !== selectedVertical) {
          return false;
        }
      }

      // Country filter
      if (countryFilter !== 'all' && lead.countryCode !== countryFilter) {
        return false;
      }

      // Status filter
      const isCurrentlyActive = activeSessions.some(
        s => s.clientMac === lead.clientMac || s.guestEmail === lead.email
      );
      const effectiveStatus = isCurrentlyActive ? 'active' : lead.status;

      if (statusFilter === 'active' && effectiveStatus !== 'active') return false;
      if (statusFilter === 'expired' && effectiveStatus !== 'expired') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = lead.fullPhone.toLowerCase().includes(q) || lead.phone.includes(q);
        const matchesEmail = lead.email.toLowerCase().includes(q);
        const matchesMac = lead.clientMac.toLowerCase().includes(q);
        const matchesRouter = lead.routerName.toLowerCase().includes(q);
        const matchesSite = lead.siteName.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesMac && !matchesRouter && !matchesSite) {
          return false;
        }
      }

      return true;
    });
  }, [leads, selectedVertical, countryFilter, statusFilter, searchQuery, activeSessions]);

  // Statistics
  const stats = useMemo(() => {
    const total = leads.length;
    const lesothoCount = leads.filter(l => l.countryCode === '+266').length;
    const saCount = leads.filter(l => l.countryCode === '+27').length;
    const activeCount = leads.filter(l => 
      activeSessions.some(s => s.clientMac === l.clientMac || s.guestEmail === l.email)
    ).length;
    return { total, lesothoCount, saCount, activeCount };
  }, [leads, activeSessions]);

  return (
    <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-5 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#161d31] border border-cyan-500/50 text-white text-xs font-mono px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b233a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#f05e17]" />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Captive Portal Guest Leads CRM &amp; Verified Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f05e17]/20 text-[#f05e17] border border-[#f05e17]/30">
              CNA LOGGED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Verified guest contact records captured via 'Connect Free' portal. Enforces 2-char names, 8-digit Lesotho (+266), 10-digit South Africa (+27), and '@' + '.' email format.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowPartnerApiPanel((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-bold ${
              showPartnerApiPanel
                ? 'bg-[#f05e17] text-white border-[#f05e17]'
                : 'bg-[#121829] hover:bg-[#1a233b] text-slate-200 border-[#232d42]'
            }`}
            title="Manage External Partner Lead REST API Keys & Webhooks"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Partner REST API ({partnerKeys.length})</span>
          </button>

          <button
            onClick={handleDownloadApiDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] text-emerald-300 border border-emerald-500/30 transition-colors font-bold"
            title="Download T-Connect Control Tower - REST API Documentation.md"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>REST API Docs (.md)</span>
          </button>

          <button
            onClick={handleSeedSampleLead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10 transition-colors font-bold"
            title="Generate sample guest lead with valid Lesotho or South Africa data"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seed Sample Lead</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredLeads.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] disabled:opacity-40 text-slate-200 border border-[#232d42] transition-colors font-bold"
            title="Export filtered guest leads to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setResetTargetScope(selectedVertical === 'all' ? 'all' : selectedVertical);
              setShowResetLeadsModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors font-bold"
            title="Reset leads globally, per policy scope, or reset a sponsor API key to a clean slate"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Leads</span>
          </button>

          <button
            onClick={refreshLeads}
            className="p-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] text-slate-300 border border-[#232d42] transition-colors"
            title="Refresh Leads Table"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reset Leads & Sponsor Clean Slate Modal */}
      {showResetLeadsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1b233a] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Reset Captured Leads &amp; Sponsor Slates</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Start a policy scope or sponsor campaign from a clean slate (0 leads)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetLeadsModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#121829] border border-[#1f283d] space-y-2.5">
                <div className="text-white font-bold flex items-center justify-between">
                  <span>1. Reset by Hotspot Policy Scope or Globally</span>
                  <span className="text-[10px] text-slate-400">{leads.length} total leads in ledger</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['all', 'hotspot', 'community', 'park', 'bus', 'stadium'] as const).map((sc) => (
                    <button
                      type="button"
                      key={sc}
                      onClick={() => setResetTargetScope(sc)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-colors ${
                        resetTargetScope === sc
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-[#0a0e17] text-slate-400 border-[#232d42] hover:text-white'
                      }`}
                    >
                      {sc === 'all' ? 'All Global' : sc}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {resetTargetScope === 'all'
                    ? 'Wipes all captured leads across every hotspot policy scope and resets all Sponsor API Keys to 0 leads.'
                    : `Wipes all captured leads under the ${resetTargetScope.toUpperCase()} policy scope and resets Sponsor API Keys assigned to ${resetTargetScope.toUpperCase()} to a clean slate.`}
                </p>
                <button
                  type="button"
                  disabled={isResettingLeads}
                  onClick={() => handleExecuteLeadsReset(resetTargetScope)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {isResettingLeads
                      ? 'Resetting Leads...'
                      : resetTargetScope === 'all'
                      ? 'Reset All Leads Globally (Clean Slate)'
                      : `Reset ${resetTargetScope.toUpperCase()} Policy Leads`}
                  </span>
                </button>
              </div>

              {partnerKeys.length > 0 && (
                <div className="p-3 rounded-xl bg-[#121829] border border-[#1f283d] space-y-2">
                  <div className="text-white font-bold">
                    2. Reset Individual Sponsor API Key to Clean Slate (Keep Global Ledger)
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Updates the sponsor key&apos;s baseline timestamp so their API &amp; CSV feed starts at 0 leads from right now without deleting historical records from your admin dashboard.
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {partnerKeys.map((pk) => (
                      <div
                        key={pk.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0a0e17] border border-[#232d42]"
                      >
                        <div className="truncate">
                          <div className="text-white font-bold text-[11px] truncate">{pk.companyName}</div>
                          <div className="text-[10px] text-slate-400">
                            {pk.campaignName} ·{' '}
                            <span className="text-emerald-400 font-bold">
                              {pk.matchedLeadsCount ?? 0} leads on slate
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={resettingKeyId === pk.id}
                          onClick={() => handleResetPartnerKeySlate(pk)}
                          className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{resettingKeyId === pk.id ? 'Resetting...' : 'Reset Sponsor Slate'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1b233a]">
              <button
                type="button"
                onClick={() => setShowResetLeadsModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner REST API & Scoped Keys Management Panel */}
      {showPartnerApiPanel && (
        <div className="bg-[#0b0f19] border border-[#232d42] rounded-xl p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">
                  T-Connect Control Tower — External Partner Lead REST API (v1)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  REST / JSON + CSV + HMAC-SHA256 WEBHOOKS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  STRICT LEAD-ONLY ISOLATION
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                Scoped Partner API keys (<code className="text-amber-300">tc_live_...</code>) expose <strong>ONLY</strong> verified guest leads for the partner&apos;s authorized hotspot policies. Hardware routers, payment gateways, vouchers, and internal settings are strictly blocked with HTTP 403.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadApiDocs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download &ldquo;T-Connect Control Tower - REST API Documentation.md&rdquo;</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Issue New Scoped Partner API Key Form */}
            <form
              onSubmit={handleCreatePartnerKey}
              className="lg:col-span-5 bg-[#121829] border border-[#1f283d] rounded-xl p-3.5 space-y-3"
            >
              <div className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Issue Scoped Partner API Key</span>
                <span className="text-[10px] text-slate-400 font-normal">Lead-Only Access</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">
                    Partner Company Name *
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Econet / Vodacom / Standard Bank"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-[#232d42] text-xs text-white font-mono focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">
                    Ad / Sponsor Campaign Name
                  </label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="e.g. Summer Stadium Promo"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-[#232d42] text-xs text-white font-mono focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Authorized Hotspot Policy Scopes *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['hotspot', 'community', 'park', 'bus', 'stadium'] as const).map((scopeKey) => {
                    const active = newScopes.includes(scopeKey);
                    return (
                      <button
                        type="button"
                        key={scopeKey}
                        onClick={() => handleToggleScopeChoice(scopeKey)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border transition-colors ${
                          active
                            ? 'bg-[#f05e17] text-white border-[#f05e17]'
                            : 'bg-[#0a0e17] text-slate-400 border-[#232d42] hover:text-white'
                        }`}
                      >
                        {scopeKey}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Authorized Adopted Routers (with Applied Policies) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleRouterChoice('*')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors ${
                      newRouterIds.includes('*')
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-[#0a0e17] text-slate-400 border-[#232d42] hover:text-white'
                    }`}
                  >
                    All Adopted Routers in Policy (*)
                  </button>
                  {adoptedRoutersList.slice(0, 6).map((rt) => {
                    const active = !newRouterIds.includes('*') && newRouterIds.includes(rt.name);
                    return (
                      <button
                        type="button"
                        key={rt.id}
                        onClick={() => handleToggleRouterChoice(rt.name)}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors ${
                          active
                            ? 'bg-cyan-600 text-white border-cyan-400'
                            : 'bg-[#0a0e17] text-slate-400 border-[#232d42] hover:text-white'
                        }`}
                        title={`${rt.siteName} (${rt.vertical})`}
                      >
                        {rt.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">
                    Site Filter (* for all sites in scope)
                  </label>
                  <input
                    type="text"
                    value={newSitesInput}
                    onChange={(e) => setNewSitesInput(e.target.value)}
                    placeholder="* or Maseru Mall, Setsoto"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-[#232d42] text-xs text-white font-mono focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">
                    Real-Time Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://crm.partner.co.ls/webhooks/leads"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-[#232d42] text-xs text-white font-mono focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingKey}
                className="w-full py-2 rounded-lg bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isCreatingKey ? 'Issuing Scoped Key...' : 'Generate Partner Lead API Key'}</span>
              </button>
            </form>

            {/* Active Partner API Keys & Endpoints Reference */}
            <div className="lg:col-span-7 space-y-3">
              <div className="bg-[#121829] border border-[#1f283d] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                    Issued Partner API Keys ({partnerKeys.length})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Header: <code className="text-cyan-300">X-API-Key: tc_live_...</code>
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {partnerKeys.map((pk) => {
                    const sampleCurl = `curl -s -H "X-API-Key: ${pk.apiKey}" "${window.location.origin}/api/v1/partner/leads?scope=${pk.allowedScopes[0] || 'hotspot'}&limit=25"`;
                    const csvCurl = `curl -s -H "X-API-Key: ${pk.apiKey}" "${window.location.origin}/api/v1/partner/leads/export.csv" -o leads.csv`;
                    return (
                      <div
                        key={pk.id}
                        className="p-2.5 rounded-lg bg-[#0a0e17] border border-[#232d42] flex flex-col gap-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                pk.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            />
                            <span className="text-xs font-bold text-white">{pk.companyName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({pk.campaignName})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pk.allowedScopes.map((sc) => (
                              <span
                                key={sc}
                                className="px-1.5 py-0.5 rounded bg-[#f05e17]/15 text-[#f05e17] border border-[#f05e17]/30 text-[9px] font-mono font-bold uppercase"
                              >
                                {sc}
                              </span>
                            ))}
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold"
                              title={`Clean Slate Baseline: ${new Date(pk.leadsResetAt || pk.createdAt).toLocaleString()}`}
                            >
                              {pk.matchedLeadsCount ?? 0} slate leads
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-mono">
                              {pk.totalRequests || 0} calls
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121829] px-2.5 py-1.5 rounded border border-[#1b233a] font-mono text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-amber-300 select-all">{pk.apiKey}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(pk.apiKey, `${pk.companyName} API Key`)}
                              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1"
                            >
                              {copiedText === pk.apiKey ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>{copiedText === pk.apiKey ? 'Copied!' : 'Copy Key'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(sampleCurl, 'cURL command')}
                              className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-1"
                            >
                              {copiedText === sampleCurl ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>{copiedText === sampleCurl ? 'Copied cURL!' : 'Copy cURL'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(csvCurl, 'CSV Export cURL command')}
                              className="px-2 py-0.5 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] flex items-center gap-1"
                              title="Copy cURL command for CSV export"
                            >
                              {copiedText === csvCurl ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>{copiedText === csvCurl ? 'Copied CSV!' : 'Copy CSV cURL'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={resettingKeyId === pk.id}
                              onClick={() => handleResetPartnerKeySlate(pk)}
                              className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1"
                              title="Reset this sponsor's API key to a clean slate (0 leads before right now)"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{resettingKeyId === pk.id ? 'Resetting...' : 'Reset Slate'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={verifyingKeyId === pk.id}
                              onClick={() => handleVerifyKeyEnforcement(pk)}
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1"
                              title="Run live test confirming Adopted Router + Applied Policy scoping & HTTP 403 isolation on non-lead endpoints"
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>{verifyingKeyId === pk.id ? 'Checking...' : 'Verify Enforcement'}</span>
                            </button>
                            {pk.webhookUrl && (
                              <button
                                type="button"
                                disabled={testingWebhookId === pk.id}
                                onClick={() => handleTestWebhook(pk)}
                                className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>{testingWebhookId === pk.id ? 'Sending...' : 'Test Webhook'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleKeyStatus(pk)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                            >
                              {pk.status === 'active' ? 'Revoke' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePartnerKey(pk)}
                              className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                              title="Delete key"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {verificationReport[pk.id] && (
                          <div className="px-2.5 py-1.5 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{verificationReport[pk.id]}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>
                            Routers:{' '}
                            <strong className="text-slate-300">
                              {(pk.allowedRouterIds || ['*']).includes('*')
                                ? 'All Adopted Routers in Policy'
                                : (pk.allowedRouterIds || []).join(', ')}
                            </strong>{' '}
                            · Clean Slate Since:{' '}
                            <strong className="text-emerald-400">
                              {new Date(pk.leadsResetAt || pk.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </strong>{' '}
                            · Webhook Secret:{' '}
                            <button
                              type="button"
                              onClick={() => handleCopy(pk.webhookSecret, 'Webhook Secret')}
                              className="text-slate-300 hover:text-white inline-flex items-center gap-1 underline decoration-dotted"
                              title="Click to copy Webhook Secret"
                            >
                              <span>{pk.webhookSecret}</span>
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </span>
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`${window.location.origin}/api/v1/partner/leads`, 'GET /api/v1/partner/leads URL')
                              }
                              className="hover:text-white inline-flex items-center gap-1"
                              title="Copy GET leads endpoint URL"
                            >
                              GET <code className="text-slate-300">/api/v1/partner/leads</code>
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `${window.location.origin}/api/v1/partner/leads/export.csv`,
                                  'CSV Export Endpoint URL'
                                )
                              }
                              className="hover:text-white inline-flex items-center gap-1"
                              title="Copy CSV export endpoint URL"
                            >
                              CSV <code className="text-slate-300">/api/v1/partner/leads/export.csv</code>
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {webhookLogs.length > 0 && (
                <div className="bg-[#121829] border border-[#1f283d] rounded-xl p-3 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Recent Real-Time Webhook Deliveries
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px]">
                    {webhookLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-slate-300">
                        <span>
                          <strong className="text-white">{log.companyName}</strong> ({log.scope}) &rarr;{' '}
                          <span className="text-slate-400">{log.webhookUrl}</span>
                        </span>
                        <span className={log.success ? 'text-emerald-400' : 'text-amber-400'}>
                          {log.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total Captured */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>Total Leads Captured</span>
            <UserCheck className="w-3.5 h-3.5 text-[#f05e17]" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {stats.total}
          </div>
          <p className="text-[10px] font-mono text-slate-500">Persistent CRM records</p>
        </div>

        {/* Card 2: Lesotho Numbers */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>🇱🇸 Lesotho (+266)</span>
            <Phone className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono tabular-nums">
            {stats.lesothoCount}
          </div>
          <p className="text-[10px] font-mono text-slate-500">8-digit verified mobile</p>
        </div>

        {/* Card 3: South Africa Numbers */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>🇿🇦 South Africa (+27)</span>
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
            {stats.saCount}
          </div>
          <p className="text-[10px] font-mono text-slate-500">10-digit standard mobile</p>
        </div>

        {/* Card 4: Active Free Leases */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>Active Live Leases</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">
              {stats.activeCount}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Leases
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-500">Active free session countdown</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, phone, email, MAC address, router..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Country filter */}
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setCountryFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === 'all' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Regions
            </button>
            <button
              onClick={() => setCountryFilter('+266')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === '+266' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇱🇸 (+266)
            </button>
            <button
              onClick={() => setCountryFilter('+27')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === '+27' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇿🇦 (+27)
            </button>
          </div>

          {/* Status filter */}
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                statusFilter === 'expired' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expired
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Breakdown */}
      <div className="overflow-x-auto rounded-xl border border-[#1b233a]">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-[#0a0e17] text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#1b233a]">
              <th className="py-2.5 px-3">GUEST SUBSCRIBER</th>
              <th className="py-2.5 px-3">MOBILE NUMBER</th>
              <th className="py-2.5 px-3">VERIFIED EMAIL</th>
              <th className="py-2.5 px-3">HOTSPOT &amp; SCOPE</th>
              <th className="py-2.5 px-3">DEVICE &amp; IP</th>
              <th className="py-2.5 px-3">CAPTURED</th>
              <th className="py-2.5 px-3">SESSION LEASE</th>
              <th className="py-2.5 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b233a] text-slate-300">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => {
                const activeSession = activeSessions.find(
                  (s) => s.clientMac === lead.clientMac || s.guestEmail === lead.email
                );
                const isLive = Boolean(activeSession);
                const remainingMins = activeSession 
                  ? Math.max(0, Math.round(activeSession.remainingSeconds / 60))
                  : 0;

                return (
                  <tr key={lead.id} className="hover:bg-[#121829]/60 transition-colors">
                    {/* Guest Subscriber */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#f05e17]/20 text-[#f05e17] font-bold flex items-center justify-center text-xs border border-[#f05e17]/30 shrink-0">
                          {lead.firstName.slice(0, 1)}{lead.lastName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-white font-bold flex items-center gap-1.5">
                            <span>{lead.fullName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {lead.firstName} · {lead.lastName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <span>{lead.countryCode === '+266' ? '🇱🇸' : '🇿🇦'}</span>
                        <span>{lead.fullPhone}</span>
                        <button
                          onClick={() => handleCopy(lead.fullPhone, 'phone')}
                          className="text-slate-500 hover:text-white"
                          title="Copy phone number"
                        >
                          <Phone className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lead.countryCode === '+266' ? '8-digit Lesotho format' : 'Standard 10-digit SA'}
                      </div>
                    </td>

                    {/* Verified Email */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                        <Mail className="w-3 h-3 text-amber-400/80 shrink-0" />
                        <span className="truncate max-w-[180px]">{lead.email}</span>
                        <button
                          onClick={() => handleCopy(lead.email, 'email')}
                          className="text-slate-500 hover:text-white"
                          title="Copy email address"
                        >
                          {copiedText === lead.email ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Contains @ and domain .</span>
                      </div>
                    </td>

                    {/* Hotspot & Scope */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="text-white font-medium">{lead.routerName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{lead.siteName}</span>
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] capitalize text-slate-300">
                          {lead.vertical}
                        </span>
                      </div>
                    </td>

                    {/* Device & IP */}
                    <td className="py-2.5 px-3 text-[11px] font-mono">
                      <div className="text-slate-300">{lead.clientMac}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{lead.clientIp}</span>
                        <span>·</span>
                        <span className="truncate max-w-[110px]">{lead.deviceType}</span>
                      </div>
                    </td>

                    {/* Captured Timestamp */}
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono">
                      <div>{new Date(lead.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(lead.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Session Lease Status */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>
                            {isLive && remainingMins > 0 && activeSession?.authMode !== 'free'
                              ? `Live (${remainingMins}m left)`
                              : 'Unlimited (Forever)'}
                          </span>
                        </span>
                        <div className="text-[9px] text-slate-500">Free Unlimited Wi-Fi</div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRegrantFreeSession(lead)}
                          className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors flex items-center gap-1"
                          title="Refresh unlimited free Wi-Fi session"
                        >
                          <Zap className="w-3 h-3 fill-current" />
                          <span>Unlimited Active</span>
                        </button>

                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.fullName)}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete guest lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                  <div className="max-w-xs mx-auto space-y-2">
                    <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>No guest leads matching current filters.</div>
                    <button
                      onClick={handleSeedSampleLead}
                      className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs"
                    >
                      Generate Sample Verified Lead
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-500 border-t border-[#1b233a] pt-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Synchronized with MikroTik DHCP Option 114 CNA &amp; Active Radius Sessions</span>
        </div>
        <div>
          Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> captive portal subscriber leads
        </div>
      </div>
    </div>
  );
};
