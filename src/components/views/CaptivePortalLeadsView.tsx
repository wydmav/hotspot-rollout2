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
  AlertTriangle,
  Edit2
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
  const [modeFilter, setModeFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    'all' | 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi'
  >('all');
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
  const [confirmDeleteLeadId, setConfirmDeleteLeadId] = useState<string | null>(null);
  const [confirmDeleteKeyId, setConfirmDeleteKeyId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<CaptivePortalLead | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editCountryCode, setEditCountryCode] = useState<'+266' | '+27'>('+266');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSiteName, setEditSiteName] = useState('');
  const [editRouterName, setEditRouterName] = useState('');

  // Normalize commercial attribution for any lead record
  const resolveLeadCommercial = (lead: CaptivePortalLead) => {
    const rawMethod = String(lead.paymentMethod || lead.mode || '').toLowerCase();
    const rawAmount = Number(lead.amount) || 0;
    const isPaid =
      lead.accessType === 'paid' ||
      rawAmount > 0 ||
      rawMethod === 'mpesa' ||
      rawMethod === 'ecocash' ||
      rawMethod === 'ottvoucher' ||
      rawMethod === 'paylesotho';

    const paymentMethod: 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi' = !isPaid
      ? 'free_wifi'
      : rawMethod === 'mpesa'
      ? 'mpesa'
      : rawMethod === 'ecocash'
      ? 'ecocash'
      : rawMethod === 'paylesotho'
      ? (lead.phone || lead.fullPhone || '').replace(/\D/g, '').replace(/^266/, '').startsWith('6')
        ? 'ecocash'
        : 'mpesa'
      : 'ottvoucher';

    const paymentMethodLabel =
      lead.paymentMethodLabel ||
      (paymentMethod === 'mpesa'
        ? 'M-Pesa (OTT Voucher)'
        : paymentMethod === 'ecocash'
        ? 'EcoCash (OTT Voucher)'
        : paymentMethod === 'ottvoucher'
        ? 'Direct 16-Digit OTT Voucher'
        : 'Free Mode Wi-Fi');

    const amount = isPaid ? (rawAmount > 0 ? rawAmount : 10) : 0;
    const planName =
      lead.planName ||
      (!isPaid
        ? 'Free Mode Wi-Fi'
        : amount >= 150
        ? 'Monthly Unlimited Pass (30 Days)'
        : amount >= 50
        ? 'Weekly Unlimited Pass (7 Days)'
        : 'Daily Unlimited (24 Hours)');

    const siteName = lead.siteName || 'Maseru Central Hub';
    const routerName = lead.routerName || 'MIKROTIK-TC';
    const district = lead.district || (siteName.toLowerCase().includes('maputsoe') || siteName.toLowerCase().includes('leribe') ? 'Leribe' : siteName.toLowerCase().includes('berea') || siteName.toLowerCase().includes('teyateyaneng') ? 'Berea' : 'Maseru');
    const venuePurchasedAt = lead.venuePurchasedAt || `${siteName} (${routerName})`;

    return {
      accessType: (isPaid ? 'paid' : 'free') as 'free' | 'paid',
      accessModeLabel: isPaid ? 'PAID' : 'FREE',
      paymentMethod,
      paymentMethodLabel,
      planName,
      amount,
      currency: lead.currency || currency || 'M',
      siteName,
      routerName,
      district,
      venuePurchasedAt,
      voucherPin: lead.ottVoucherPin || lead.voucherCode || '',
      transactionRef: lead.transactionRef || ''
    };
  };

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
        let mutated = false;
        const currentLeads = storage.getCaptiveLeads();
        for (const ev of data.events) {
          const emailVal = (ev.email || ev.guestEmail || '').trim();
          const phoneVal = (ev.phone || ev.guestPhone || '').trim();
          const nameVal = (ev.guestName || `${ev.firstName || ''} ${ev.lastName || ''}`).trim();
          if (!emailVal && !phoneVal && (!nameVal || nameVal === 'Guest User')) continue;
          const leadId = `lead_srv_${ev.id}`;
          const rawMethod = String(ev.paymentMethod || ev.mode || '').toLowerCase();
          const isPaidEv =
            ev.accessType === 'paid' ||
            Number(ev.amount) > 0 ||
            rawMethod === 'mpesa' ||
            rawMethod === 'ecocash' ||
            rawMethod === 'ottvoucher' ||
            rawMethod === 'paylesotho';
          const resolvedPaymentMethod: 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi' = !isPaidEv
            ? 'free_wifi'
            : rawMethod === 'mpesa'
            ? 'mpesa'
            : rawMethod === 'ecocash'
            ? 'ecocash'
            : 'ottvoucher';
          const resolvedPaymentLabel =
            ev.paymentMethodLabel ||
            (resolvedPaymentMethod === 'mpesa'
              ? 'M-Pesa (OTT Voucher)'
              : resolvedPaymentMethod === 'ecocash'
              ? 'EcoCash (OTT Voucher)'
              : resolvedPaymentMethod === 'ottvoucher'
              ? 'Direct 16-Digit OTT Voucher'
              : 'Free Mode Wi-Fi');

          const existingMatch = currentLeads.find(
            (l) =>
              l.id === leadId ||
              l.id === `lead_${ev.id}` ||
              (phoneVal &&
                (l.fullPhone || l.phone || '').replace(/\D/g, '') === phoneVal.replace(/\D/g, '') &&
                (l.accessType || 'free') === (isPaidEv ? 'paid' : 'free') &&
                Math.abs(new Date(l.capturedAt).getTime() - new Date(ev.capturedAt || Date.now()).getTime()) < 120000)
          );

          if (!existingMatch) {
            const parts = nameVal.split(' ');
            const cleanDigits = phoneVal.replace(/^\+266\s?|\+27\s?/, '').trim();
            const cc = ev.countryCode === '+27' ? '+27' : '+266';
            storage.addCaptiveLead({
              id: leadId,
              firstName: ev.firstName || parts[0] || 'Guest',
              lastName: ev.lastName || parts.slice(1).join(' ') || 'Subscriber',
              fullName: nameVal || 'Guest Subscriber',
              countryCode: cc,
              phone: cleanDigits,
              fullPhone: phoneVal.startsWith('+') ? phoneVal : `${cc} ${cleanDigits}`,
              email: emailVal || '—',
              capturedAt: ev.capturedAt || ev.connectedAt || new Date().toISOString(),
              routerName: ev.routerName || 'MIKROTIK-TC',
              siteName: ev.siteName || 'T-Connect Hotspot',
              district: ev.district || 'Maseru',
              venuePurchasedAt: ev.venuePurchasedAt || `${ev.siteName || 'T-Connect Hotspot'} (${ev.routerName || 'MIKROTIK-TC'})`,
              vertical: (ev.scope as VerticalType) || 'hotspot',
              scope: (ev.scope as VerticalType) || 'hotspot',
              clientMac: ev.mac || 'Client-MAC',
              mac: ev.mac || 'Client-MAC',
              clientIp: ev.ip || '10.10.0.x',
              ip: ev.ip || '10.10.0.x',
              deviceType: 'Wi-Fi Guest',
              durationMinutes: ev.durationSeconds ? Math.round(ev.durationSeconds / 60) : 0,
              status: 'active',
              mode:
                resolvedPaymentMethod === 'mpesa'
                  ? 'mpesa'
                  : resolvedPaymentMethod === 'ecocash'
                  ? 'ecocash'
                  : resolvedPaymentMethod === 'ottvoucher'
                  ? 'ottvoucher'
                  : 'free',
              accessType: isPaidEv ? 'paid' : 'free',
              paymentMethod: resolvedPaymentMethod,
              paymentMethodLabel: resolvedPaymentLabel,
              planName: ev.planName || (isPaidEv ? 'Daily Unlimited (24 Hours)' : 'Free Mode Wi-Fi'),
              amount: Number(ev.amount) || (isPaidEv ? 10 : 0),
              currency: 'M',
              voucherCode: ev.voucherCode || undefined,
              ottVoucherPin: ev.ottVoucherPin || ev.voucherCode || undefined,
              transactionRef: ev.transactionRef || undefined
            });
            mutated = true;
          } else if (isPaidEv && existingMatch.accessType !== 'paid') {
            storage.updateCaptiveLead(existingMatch.id, {
              accessType: 'paid',
              paymentMethod: resolvedPaymentMethod,
              paymentMethodLabel: resolvedPaymentLabel,
              planName: ev.planName || existingMatch.planName || 'Daily Unlimited (24 Hours)',
              amount: Number(ev.amount) || 10,
              currency: 'M',
              voucherCode: ev.voucherCode || existingMatch.voucherCode,
              ottVoucherPin: ev.ottVoucherPin || ev.voucherCode || existingMatch.ottVoucherPin,
              transactionRef: ev.transactionRef || existingMatch.transactionRef
            });
            mutated = true;
          }
        }
        if (mutated && mounted) {
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

      const commSum = leadsData?.commercialSummary;
      const commText = commSum
        ? ` · Free: ${commSum.freeLeadsCount ?? 0} | Paid: ${commSum.paidLeadsCount ?? 0} | Revenue: M${Number(commSum.totalRevenueMaloti || 0).toFixed(2)}`
        : '';

      const summary =
        leadsRes.ok && isIsolated && zeroLeakage
          ? `ENFORCED & LIVE: ${leadsData?.pagination?.totalLeads ?? 0} scoped leads (${keyItem.allowedScopes.join(', ').toUpperCase()})${commText} · Non-lead APIs blocked (HTTP 403) · Zero hardware leakage.`
          : `Check status: Leads HTTP ${leadsRes.status}, Isolation HTTP ${blockedRes.status}`;

      setVerificationReport((prev) => ({ ...prev, [keyItem.id]: summary }));
      showToast('Verified Partner & Finance API key enforcement and real-time commercial payload');
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
        showToast(`Issued REST API Key for ${data.key?.companyName}`);
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
    setConfirmDeleteLeadId(null);
    refreshLeads();
    showToast(`Deleted guest lead record for ${name}`);
  };

  const openEditLeadModal = (lead: CaptivePortalLead) => {
    setEditingLead(lead);
    setEditFirstName(lead.firstName);
    setEditLastName(lead.lastName);
    setEditCountryCode(lead.countryCode === '+27' ? '+27' : '+266');
    setEditPhone(lead.phone);
    setEditEmail(lead.email);
    setEditSiteName(lead.siteName);
    setEditRouterName(lead.routerName);
  };

  const handleSaveEditedLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    const fName = editFirstName.trim() || editingLead.firstName;
    const lName = editLastName.trim() || editingLead.lastName;
    const rawDigits = editPhone.replace(/\D/g, '') || editingLead.phone;
    storage.updateCaptiveLead(editingLead.id, {
      firstName: fName,
      lastName: lName,
      fullName: `${fName} ${lName}`.trim(),
      countryCode: editCountryCode,
      phone: rawDigits,
      fullPhone: `${editCountryCode} ${rawDigits}`,
      email: editEmail.trim() || editingLead.email,
      siteName: editSiteName.trim() || editingLead.siteName,
      routerName: editRouterName.trim() || editingLead.routerName
    });
    setEditingLead(null);
    refreshLeads();
    showToast(`Updated guest lead record for ${fName} ${lName}`);
  };

  // Seed a realistic commercial record (alternating Free Mode Lead, M-Pesa OTT Voucher, EcoCash OTT Voucher, Direct OTT Voucher)
  const handleSeedSampleLead = () => {
    const sampleScenarios: Array<{
      fName: string;
      lName: string;
      phone: string;
      accessType: 'free' | 'paid';
      paymentMethod: 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi';
      paymentMethodLabel: string;
      planName: string;
      amount: number;
      siteName: string;
      routerName: string;
      district: string;
      scope: VerticalType;
    }> = [
      {
        fName: 'Bohlokoa',
        lName: 'Majoro',
        phone: `58${Math.floor(100000 + Math.random() * 899999)}`,
        accessType: 'paid',
        paymentMethod: 'mpesa',
        paymentMethodLabel: 'M-Pesa (OTT Voucher)',
        planName: 'Daily Unlimited (24 Hours)',
        amount: 10,
        siteName: 'Maseru Central Mall Hub',
        routerName: 'MIKROTIK-MASERU-AP1',
        district: 'Maseru',
        scope: 'hotspot'
      },
      {
        fName: 'Palesa',
        lName: 'Moshoeshoe',
        phone: `62${Math.floor(100000 + Math.random() * 899999)}`,
        accessType: 'paid',
        paymentMethod: 'ecocash',
        paymentMethodLabel: 'EcoCash (OTT Voucher)',
        planName: 'Weekly Unlimited Pass (7 Days)',
        amount: 50,
        siteName: 'Maputsoe Border Market',
        routerName: 'MIKROTIK-LERIBE-AP2',
        district: 'Leribe',
        scope: 'hotspot'
      },
      {
        fName: 'Thabo',
        lName: 'Lekhanya',
        phone: `59${Math.floor(100000 + Math.random() * 899999)}`,
        accessType: 'free',
        paymentMethod: 'free_wifi',
        paymentMethodLabel: 'Free Mode Wi-Fi',
        planName: 'Free Mode Wi-Fi (24 Hours)',
        amount: 0,
        siteName: 'Teyateyaneng Civic Plaza',
        routerName: 'MIKROTIK-BEREA-AP1',
        district: 'Berea',
        scope: 'community'
      },
      {
        fName: 'Kekeletso',
        lName: 'Sechele',
        phone: `57${Math.floor(100000 + Math.random() * 899999)}`,
        accessType: 'paid',
        paymentMethod: 'mpesa',
        paymentMethodLabel: 'M-Pesa (OTT Voucher)',
        planName: 'Monthly Unlimited Pass (30 Days)',
        amount: 150,
        siteName: 'Setsoto National Stadium',
        routerName: 'MIKROTIK-STADIUM-CORE',
        district: 'Maseru',
        scope: 'stadium'
      },
      {
        fName: 'Lineo',
        lName: 'Makoae',
        phone: `63${Math.floor(100000 + Math.random() * 899999)}`,
        accessType: 'paid',
        paymentMethod: 'ottvoucher',
        paymentMethodLabel: 'Direct 16-Digit OTT Voucher',
        planName: 'Daily Unlimited (24 Hours)',
        amount: 10,
        siteName: 'Maseru Bus Stop Terminal',
        routerName: 'MIKROTIK-TRANSIT-AP1',
        district: 'Maseru',
        scope: 'bus'
      }
    ];

    const pick = sampleScenarios[leads.length % sampleScenarios.length];
    const email = `${pick.fName.toLowerCase()}.${pick.lName.toLowerCase()}${Math.floor(10 + Math.random() * 89)}@tconnect.co.ls`;
    const ottPin =
      pick.accessType === 'paid'
        ? `${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`
        : undefined;

    const newLead: CaptivePortalLead = {
      id: `lead_cna_${Date.now()}`,
      firstName: pick.fName,
      lastName: pick.lName,
      fullName: `${pick.fName} ${pick.lName}`,
      countryCode: '+266',
      phone: pick.phone,
      fullPhone: `+266 ${pick.phone}`,
      email,
      capturedAt: new Date().toISOString(),
      routerName: pick.routerName,
      siteName: pick.siteName,
      district: pick.district,
      venuePurchasedAt: `${pick.siteName} (${pick.routerName})`,
      vertical: pick.scope,
      scope: pick.scope,
      clientMac: `40:${Math.floor(10 + Math.random() * 89)}:76:A2:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}`,
      clientIp: `10.10.0.${Math.floor(10 + Math.random() * 200)}`,
      deviceType: Math.random() > 0.5 ? 'Apple iPhone (iOS 17)' : 'Samsung Galaxy A54',
      durationMinutes: pick.accessType === 'paid' ? 1440 : 1440,
      status: 'active',
      mode:
        pick.paymentMethod === 'mpesa'
          ? 'mpesa'
          : pick.paymentMethod === 'ecocash'
          ? 'ecocash'
          : pick.paymentMethod === 'ottvoucher'
          ? 'ottvoucher'
          : 'free',
      accessType: pick.accessType,
      paymentMethod: pick.paymentMethod,
      paymentMethodLabel: pick.paymentMethodLabel,
      planName: pick.planName,
      amount: pick.amount,
      currency: 'M',
      voucherCode: ottPin,
      ottVoucherPin: ottPin,
      transactionRef: pick.accessType === 'paid' ? `OTT-${Date.now().toString().slice(-6)}` : undefined
    };

    storage.addCaptiveLead(newLead);

    // Also sync to backend serverStore so the Partner & Finance REST API (/api/v1/partner/leads) immediately serves it
    fetch('/api/portal/guest-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        guestName: newLead.fullName,
        countryCode: newLead.countryCode,
        phone: newLead.phone,
        guestPhone: newLead.fullPhone,
        email: newLead.email,
        mac: newLead.clientMac,
        ip: newLead.clientIp,
        scope: newLead.vertical,
        siteName: newLead.siteName,
        routerName: newLead.routerName,
        district: newLead.district,
        mode: newLead.mode,
        accessType: newLead.accessType,
        paymentMethod: newLead.paymentMethod,
        paymentChannel: newLead.paymentMethod,
        planName: newLead.planName,
        amount: newLead.amount,
        voucherCode: newLead.voucherCode,
        transactionRef: newLead.transactionRef
      })
    }).catch(() => {});

    refreshLeads();
    showToast(
      `Seeded ${pick.accessType === 'paid' ? `${pick.paymentMethodLabel} (M${pick.amount})` : 'Free Mode Wi-Fi'} record at ${pick.siteName}`
    );
  };

  // Commercial CSV Exporter supporting 'all' | 'free' | 'paid' scopes
  const handleExportCommercialCsv = (targetMode: 'all' | 'free' | 'paid' = 'all') => {
    const sourceRows = filteredLeads.filter((l) => {
      const c = resolveLeadCommercial(l);
      if (targetMode === 'free') return c.accessType === 'free';
      if (targetMode === 'paid') return c.accessType === 'paid';
      return true;
    });

    if (sourceRows.length === 0) {
      showToast(
        targetMode === 'free'
          ? 'No Free Mode leads available to export'
          : targetMode === 'paid'
          ? 'No Paid transactions available to export'
          : 'No leads available to export'
      );
      return;
    }

    const csvEsc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Lead ID',
      'Guest Full Name',
      'First Name',
      'Surname',
      'Mobile Number',
      'Email Address',
      'Access Mode (FREE/PAID)',
      'Payment Method Used',
      'Package / Plan Name',
      'Price Paid (Maloti)',
      'Hotspot / Location Name',
      'Router Identity',
      'District',
      'Venue / Router Purchased At',
      'OTT Voucher / Reference',
      'Client MAC',
      'Captured Timestamp'
    ];

    const rows = sourceRows.map((l) => {
      const c = resolveLeadCommercial(l);
      return [
        l.id,
        l.fullName,
        l.firstName,
        l.lastName,
        l.fullPhone || `${l.countryCode} ${l.phone}`,
        l.email || '—',
        c.accessModeLabel,
        c.paymentMethodLabel,
        c.planName,
        `${c.currency}${c.amount.toFixed(2)}`,
        c.siteName,
        c.routerName,
        c.district,
        c.venuePurchasedAt,
        c.voucherPin || c.transactionRef || (c.accessType === 'free' ? 'FREE-MODE' : 'PAID-OTT'),
        l.clientMac || l.mac || '—',
        l.capturedAt
      ].map(csvEsc);
    });

    // Append Commercial Summary Footer Rows for Finance Reconciliation
    const totalRev = sourceRows.reduce((sum, l) => sum + resolveLeadCommercial(l).amount, 0);
    const mpesaRev = sourceRows
      .filter((l) => resolveLeadCommercial(l).paymentMethod === 'mpesa')
      .reduce((sum, l) => sum + resolveLeadCommercial(l).amount, 0);
    const ecocashRev = sourceRows
      .filter((l) => resolveLeadCommercial(l).paymentMethod === 'ecocash')
      .reduce((sum, l) => sum + resolveLeadCommercial(l).amount, 0);
    const ottRev = sourceRows
      .filter((l) => resolveLeadCommercial(l).paymentMethod === 'ottvoucher')
      .reduce((sum, l) => sum + resolveLeadCommercial(l).amount, 0);

    const summaryRows = [
      [],
      [
        csvEsc('SUMMARY'),
        csvEsc(`Total Records: ${sourceRows.length}`),
        csvEsc(`M-Pesa (OTT) Revenue: M${mpesaRev.toFixed(2)}`),
        csvEsc(`EcoCash (OTT) Revenue: M${ecocashRev.toFixed(2)}`),
        csvEsc(`Direct OTT Revenue: M${ottRev.toFixed(2)}`),
        csvEsc(`TOTAL REVENUE: M${totalRev.toFixed(2)}`)
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
      ...summaryRows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug =
      targetMode === 'free'
        ? 'tconnect_free_mode_leads'
        : targetMode === 'paid'
        ? 'tconnect_paid_finance_transactions'
        : 'tconnect_commercial_leads_ledger';
    link.setAttribute('href', url);
    link.setAttribute('download', `${slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      targetMode === 'free'
        ? `Exported ${sourceRows.length} Free Mode leads to CSV`
        : targetMode === 'paid'
        ? `Exported ${sourceRows.length} Paid Finance transactions (M${totalRev.toFixed(2)}) to CSV`
        : `Exported ${sourceRows.length} commercial records to CSV`
    );
  };

  // Pure TypeScript PDF 1.4 Binary Report Generator (No window.open / popup blocker issues)
  const handleExportCommercialPdf = (targetMode: 'all' | 'free' | 'paid' = 'all') => {
    const sourceRows = filteredLeads.filter((l) => {
      const c = resolveLeadCommercial(l);
      if (targetMode === 'free') return c.accessType === 'free';
      if (targetMode === 'paid') return c.accessType === 'paid';
      return true;
    });

    if (sourceRows.length === 0) {
      showToast(
        targetMode === 'free'
          ? 'No Free Mode leads available for PDF export'
          : targetMode === 'paid'
          ? 'No Paid transactions available for PDF export'
          : 'No leads available for PDF export'
      );
      return;
    }

    const reportTitle =
      targetMode === 'free'
        ? 'T-CONNECT CONTROL TOWER - FREE MODE GUEST LEADS REPORT'
        : targetMode === 'paid'
        ? 'T-CONNECT CONTROL TOWER - PAID TRANSACTIONS & OTT VOUCHER FINANCE LEDGER'
        : 'T-CONNECT CONTROL TOWER - COMPLETE COMMERCIAL LEADS & REVENUE LEDGER';

    const freeCount = sourceRows.filter((l) => resolveLeadCommercial(l).accessType === 'free').length;
    const paidCount = sourceRows.filter((l) => resolveLeadCommercial(l).accessType === 'paid').length;
    const totalRev = sourceRows.reduce((s, l) => s + resolveLeadCommercial(l).amount, 0);
    const mpesaRows = sourceRows.filter((l) => resolveLeadCommercial(l).paymentMethod === 'mpesa');
    const ecocashRows = sourceRows.filter((l) => resolveLeadCommercial(l).paymentMethod === 'ecocash');
    const ottDirectRows = sourceRows.filter((l) => resolveLeadCommercial(l).paymentMethod === 'ottvoucher');
    const mpesaRev = mpesaRows.reduce((s, l) => s + resolveLeadCommercial(l).amount, 0);
    const ecocashRev = ecocashRows.reduce((s, l) => s + resolveLeadCommercial(l).amount, 0);
    const ottDirectRev = ottDirectRows.reduce((s, l) => s + resolveLeadCommercial(l).amount, 0);

    // Group revenue & leads by Hotspot Location / Router
    const venueStats = new Map<string, { leads: number; free: number; paid: number; revenue: number; router: string; district: string }>();
    sourceRows.forEach((l) => {
      const c = resolveLeadCommercial(l);
      const key = `${c.siteName} | ${c.routerName}`;
      const cur = venueStats.get(key) || {
        leads: 0,
        free: 0,
        paid: 0,
        revenue: 0,
        router: c.routerName,
        district: c.district
      };
      cur.leads += 1;
      if (c.accessType === 'paid') {
        cur.paid += 1;
        cur.revenue += c.amount;
      } else {
        cur.free += 1;
      }
      venueStats.set(key, cur);
    });

    const pdfClean = (str: string) =>
      String(str || '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    const lines: Array<{ text: string; size?: number; bold?: boolean }> = [
      { text: reportTitle, size: 12, bold: true },
      {
        text: `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC  |  Currency: Lesotho Maloti (M)`,
        size: 8
      },
      { text: '========================================================================================================', size: 8 },
      { text: '1. EXECUTIVE COMMERCIAL & FINANCE SUMMARY', size: 10, bold: true },
      {
        text: `Total Records: ${sourceRows.length}   |   Free Mode Leads: ${freeCount} (M0.00)   |   Paid OTT Transactions: ${paidCount} (M${totalRev.toFixed(2)})`,
        size: 9,
        bold: true
      },
      {
        text: `M-Pesa (OTT Voucher): ${mpesaRows.length} tx (M${mpesaRev.toFixed(2)})   |   EcoCash (OTT Voucher): ${ecocashRows.length} tx (M${ecocashRev.toFixed(2)})   |   Direct 16-Digit OTT: ${ottDirectRows.length} tx (M${ottDirectRev.toFixed(2)})`,
        size: 8.5
      },
      { text: '--------------------------------------------------------------------------------------------------------', size: 8 },
      { text: '2. BREAKDOWN BY HOTSPOT LOCATION, ROUTER & DISTRICT', size: 10, bold: true }
    ];

    Array.from(venueStats.entries()).forEach(([venueKey, st]) => {
      const siteOnly = venueKey.split(' | ')[0];
      lines.push({
        text: `Hotspot: ${siteOnly.padEnd(26, ' ').slice(0, 26)} | Router: ${st.router.padEnd(20, ' ').slice(0, 20)} | District: ${st.district.padEnd(10, ' ').slice(0, 10)} | Free: ${String(st.free).padStart(2, ' ')} | Paid: ${String(st.paid).padStart(2, ' ')} | Revenue: M${st.revenue.toFixed(2)}`,
        size: 8
      });
    });

    lines.push({ text: '--------------------------------------------------------------------------------------------------------', size: 8 });
    lines.push({ text: '3. DETAILED GUEST LEADS & TRANSACTION ATTRIBUTION LEDGER', size: 10, bold: true });
    lines.push({
      text: `${'GUEST NAME'.padEnd(18, ' ')} | ${'MOBILE'.padEnd(13, ' ')} | ${'MODE'.padEnd(5, ' ')} | ${'PAYMENT METHOD'.padEnd(22, ' ')} | ${'PACKAGE'.padEnd(18, ' ')} | ${'PRICE'.padEnd(7, ' ')} | ${'HOTSPOT / ROUTER'.padEnd(28, ' ')} | DATE`,
      size: 7.5,
      bold: true
    });
    lines.push({ text: '--------------------------------------------------------------------------------------------------------', size: 8 });

    sourceRows.forEach((l) => {
      const c = resolveLeadCommercial(l);
      const guestCol = (l.fullName || `${l.firstName} ${l.lastName}`).padEnd(18, ' ').slice(0, 18);
      const phoneCol = (l.fullPhone || `${l.countryCode} ${l.phone}`).padEnd(13, ' ').slice(0, 13);
      const modeCol = c.accessModeLabel.padEnd(5, ' ').slice(0, 5);
      const methodCol = c.paymentMethodLabel.padEnd(22, ' ').slice(0, 22);
      const planCol = c.planName.padEnd(18, ' ').slice(0, 18);
      const priceCol = `M${c.amount.toFixed(2)}`.padEnd(7, ' ').slice(0, 7);
      const locCol = `${c.siteName} (${c.routerName})`.padEnd(28, ' ').slice(0, 28);
      const dateCol = new Date(l.capturedAt).toISOString().replace('T', ' ').slice(0, 16);
      lines.push({
        text: `${guestCol} | ${phoneCol} | ${modeCol} | ${methodCol} | ${planCol} | ${priceCol} | ${locCol} | ${dateCol}`,
        size: 7.2
      });
    });

    // Paginate into 46 lines per landscape A4 page (842 x 595 pt)
    const linesPerPage = 44;
    const pageChunks: Array<typeof lines> = [];
    for (let i = 0; i < lines.length; i += linesPerPage) {
      pageChunks.push(lines.slice(i, i + linesPerPage));
    }
    if (pageChunks.length === 0) pageChunks.push(lines);

    const objects: string[] = [];
    // 1: Catalog, 2: Pages, 3: Helvetica Font, 4: Courier-Bold Font, 5: Courier Font
    const pageObjIds: number[] = [];
    let nextObjId = 6;

    const pageContents: Array<{ pageId: number; contentId: number; stream: string }> = [];
    pageChunks.forEach((chunk, pageIdx) => {
      const pageId = nextObjId++;
      const contentId = nextObjId++;
      pageObjIds.push(pageId);

      let y = 555;
      const streamLines: string[] = ['BT'];
      chunk.forEach((ln) => {
        const fontRef = ln.bold ? '/F2' : '/F3';
        const fontSize = ln.size || 8;
        streamLines.push(`${fontRef} ${fontSize} Tf`);
        streamLines.push(`1 0 0 1 28 ${y.toFixed(1)} Tm`);
        streamLines.push(`(${pdfClean(ln.text)}) Tj`);
        y -= fontSize + 3.8;
      });
      // Page footer
      streamLines.push('/F3 7.5 Tf');
      streamLines.push(`1 0 0 1 28 18 Tm`);
      streamLines.push(
        `(${pdfClean(`T-Connect Control Tower Commercial Ledger  |  Page ${pageIdx + 1} of ${pageChunks.length}`)}) Tj`
      );
      streamLines.push('ET');
      pageContents.push({ pageId, contentId, stream: streamLines.join('\n') });
    });

    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;
    objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
    objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n`;
    objects[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`;

    pageContents.forEach((pc) => {
      objects[pc.pageId] = `${pc.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pc.contentId} 0 R >>\nendobj\n`;
      objects[pc.contentId] = `${pc.contentId} 0 obj\n<< /Length ${pc.stream.length} >>\nstream\n${pc.stream}\nendstream\nendobj\n`;
    });

    let pdfStr = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = pdfStr.length;
      pdfStr += objects[i];
    }
    const xrefOffset = pdfStr.length;
    pdfStr += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      pdfStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdfStr += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdfStr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug =
      targetMode === 'free'
        ? 'tconnect_free_mode_leads_report'
        : targetMode === 'paid'
        ? 'tconnect_paid_finance_report'
        : 'tconnect_commercial_ledger_report';
    link.setAttribute('href', url);
    link.setAttribute('download', `${slug}_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      targetMode === 'free'
        ? `Downloaded Free Mode Leads PDF Report (${sourceRows.length} leads)`
        : targetMode === 'paid'
        ? `Downloaded Paid Finance PDF Report (${sourceRows.length} transactions · M${totalRev.toFixed(2)})`
        : `Downloaded Complete Commercial PDF Report (${sourceRows.length} records)`
    );
  };

  // Active Sessions for status synchronization
  const activeSessions = useMemo(() => {
    return storage.getActiveSessions() || [];
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const comm = resolveLeadCommercial(lead);

      // Vertical filter
      if (selectedVertical !== 'all') {
        if (selectedVertical === 'village' || selectedVertical === 'community') {
          if (lead.vertical !== 'village' && lead.vertical !== 'community') return false;
        } else if (lead.vertical !== selectedVertical) {
          return false;
        }
      }

      // Access Mode filter ('all' | 'free' | 'paid')
      if (modeFilter !== 'all' && comm.accessType !== modeFilter) {
        return false;
      }

      // Payment Method filter ('all' | 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi')
      if (paymentMethodFilter !== 'all' && comm.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // Country filter
      if (countryFilter !== 'all' && lead.countryCode !== countryFilter) {
        return false;
      }

      // Status filter
      const isCurrentlyActive = activeSessions.some(
        (s) => s.clientMac === lead.clientMac || s.guestEmail === lead.email
      );
      const effectiveStatus = isCurrentlyActive ? 'active' : lead.status;

      if (statusFilter === 'active' && effectiveStatus !== 'active') return false;
      if (statusFilter === 'expired' && effectiveStatus !== 'expired') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = (lead.fullPhone || '').toLowerCase().includes(q) || (lead.phone || '').includes(q);
        const matchesEmail = (lead.email || '').toLowerCase().includes(q);
        const matchesMac = (lead.clientMac || '').toLowerCase().includes(q);
        const matchesRouter = comm.routerName.toLowerCase().includes(q);
        const matchesSite = comm.siteName.toLowerCase().includes(q);
        const matchesDistrict = comm.district.toLowerCase().includes(q);
        const matchesMethod = comm.paymentMethodLabel.toLowerCase().includes(q);
        const matchesPlan = comm.planName.toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesPhone &&
          !matchesEmail &&
          !matchesMac &&
          !matchesRouter &&
          !matchesSite &&
          !matchesDistrict &&
          !matchesMethod &&
          !matchesPlan
        ) {
          return false;
        }
      }

      return true;
    });
  }, [leads, selectedVertical, modeFilter, paymentMethodFilter, countryFilter, statusFilter, searchQuery, activeSessions]);

  // Commercial & Lead Statistics
  const stats = useMemo(() => {
    const total = leads.length;
    let freeCount = 0;
    let paidCount = 0;
    let totalRevenue = 0;
    let mpesaCount = 0;
    let mpesaRevenue = 0;
    let ecocashCount = 0;
    let ecocashRevenue = 0;
    let ottDirectCount = 0;
    let ottDirectRevenue = 0;

    leads.forEach((l) => {
      const c = resolveLeadCommercial(l);
      if (c.accessType === 'paid') {
        paidCount += 1;
        totalRevenue += c.amount;
        if (c.paymentMethod === 'mpesa') {
          mpesaCount += 1;
          mpesaRevenue += c.amount;
        } else if (c.paymentMethod === 'ecocash') {
          ecocashCount += 1;
          ecocashRevenue += c.amount;
        } else {
          ottDirectCount += 1;
          ottDirectRevenue += c.amount;
        }
      } else {
        freeCount += 1;
      }
    });

    const activeCount = leads.filter((l) =>
      activeSessions.some((s) => s.clientMac === l.clientMac || s.guestEmail === l.email)
    ).length;

    return {
      total,
      freeCount,
      paidCount,
      totalRevenue,
      mpesaCount,
      mpesaRevenue,
      ecocashCount,
      ecocashRevenue,
      ottDirectCount,
      ottDirectRevenue,
      activeCount
    };
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
          <div className="flex items-center gap-2 flex-wrap">
            <UserCheck className="w-5 h-5 text-[#f05e17]" />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Guest Leads CRM &amp; Finance Commercial Attribution Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f05e17]/20 text-[#f05e17] border border-[#f05e17]/30">
              FREE &amp; PAID OTT ATTRIBUTION
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time Free Mode &amp; Paid Mode (M-Pesa / EcoCash / 16-Digit OTT Voucher) lead capture with package price, hotspot location, router identity, REST API key feed, and separate Finance CSV &amp; PDF exports.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowPartnerApiPanel((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-bold cursor-pointer ${
              showPartnerApiPanel
                ? 'bg-[#f05e17] text-white border-[#f05e17]'
                : 'bg-[#121829] hover:bg-[#1a233b] text-slate-200 border-[#232d42]'
            }`}
            title="Manage External Partner & Finance REST API Keys & Webhooks"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Partner &amp; Finance API ({partnerKeys.length})</span>
          </button>

          <button
            onClick={handleDownloadApiDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] text-emerald-300 border border-emerald-500/30 transition-colors font-bold cursor-pointer"
            title="Download T-Connect Control Tower - REST API Documentation.md"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>REST API Docs (.md)</span>
          </button>

          <button
            onClick={handleSeedSampleLead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10 transition-colors font-bold cursor-pointer"
            title="Seed sample Free Mode or Paid Mode (M-Pesa / EcoCash / OTT Voucher) record"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seed Commercial Record</span>
          </button>

          <button
            onClick={() => {
              setResetTargetScope(selectedVertical === 'all' ? 'all' : selectedVertical);
              setShowResetLeadsModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors font-bold cursor-pointer"
            title="Reset leads globally, per policy scope, or reset a sponsor API key to a clean slate"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Leads</span>
          </button>

          <button
            onClick={refreshLeads}
            className="p-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] text-slate-300 border border-[#232d42] transition-colors cursor-pointer"
            title="Refresh Leads Table"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dedicated Finance & Commercial CSV + PDF Export Bar */}
      <div className="bg-[#0b0f19] border border-[#232d42] rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#f05e17] shrink-0" />
          <div>
            <span className="text-white font-bold">Finance &amp; External Partner Commercial Exports</span>
            <span className="text-slate-400 text-[11px] block sm:inline sm:ml-2">
              Includes Guest Name, Mobile, Access Mode, Payment Method (M-Pesa / EcoCash / OTT), Package Price (M), Hotspot Location &amp; Router
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Free Mode Leads CSV & PDF */}
          <button
            type="button"
            onClick={() => handleExportCommercialCsv('free')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Free Leads CSV ({stats.freeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportCommercialPdf('free')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Free Leads PDF</span>
          </button>

          {/* Paid Finance Transactions CSV & PDF */}
          <button
            type="button"
            onClick={() => handleExportCommercialCsv('paid')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Paid Finance CSV ({stats.paidCount})</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportCommercialPdf('paid')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Paid Finance PDF</span>
          </button>

          {/* All Commercial Records CSV & PDF */}
          <button
            type="button"
            onClick={() => handleExportCommercialCsv('all')}
            className="px-2.5 py-1.5 rounded-lg bg-[#f05e17]/20 hover:bg-[#f05e17]/30 text-[#ff8b4d] border border-[#f05e17]/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>All Records CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportCommercialPdf('all')}
            className="px-2.5 py-1.5 rounded-lg bg-[#f05e17] hover:bg-[#d94e0f] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>All Records PDF</span>
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
                  NAME, SURNAME &amp; PLACE CONNECTED ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                Scoped Partner API keys (<code className="text-amber-300">tc_live_...</code>) expose <strong>ONLY Name, Surname, and Place Connected</strong> (<code className="text-cyan-300">name</code>, <code className="text-cyan-300">surname</code>, <code className="text-cyan-300">placeConnected</code>) in real time for the partner&apos;s authorized hotspot locations. Phone numbers, emails, MAC addresses, routers, and payment gateways are strictly stripped from Partner API responses.
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
                            {confirmDeleteKeyId === pk.id ? (
                              <div className="inline-flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeletePartnerKey(pk);
                                    setConfirmDeleteKeyId(null);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKeyId(null)}
                                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKeyId(pk.id)}
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                                title="Delete key"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
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

      {/* Commercial Finance & Lead KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Card 1: Total Captured */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>Total Leads Captured</span>
            <UserCheck className="w-3.5 h-3.5 text-[#f05e17]" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {stats.total}
          </div>
          <p className="text-[10px] font-mono text-slate-500">
            {stats.freeCount} Free · {stats.paidCount} Paid
          </p>
        </div>

        {/* Card 2: Free Mode Leads */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>Free Mode Leads</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono tabular-nums">
            {stats.freeCount}
          </div>
          <p className="text-[10px] font-mono text-slate-500">Step 1 Lead → Login for free</p>
        </div>

        {/* Card 3: Total Paid OTT Revenue */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-[10px] font-mono uppercase font-bold">
            <span>Paid OTT Revenue</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
            M{stats.totalRevenue.toFixed(2)}
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            {stats.paidCount} paid OTT voucher sessions
          </p>
        </div>

        {/* Card 4: M-Pesa (OTT Voucher) */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>M-Pesa (OTT)</span>
            <Phone className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tabular-nums">
            M{stats.mpesaRevenue.toFixed(2)}
          </div>
          <p className="text-[10px] font-mono text-slate-500">
            {stats.mpesaCount} redeemed ({stats.mpesaCount === 1 ? 'session' : 'sessions'})
          </p>
        </div>

        {/* Card 5: EcoCash & Direct OTT */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
            <span>EcoCash &amp; Direct OTT</span>
            <Phone className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono tabular-nums">
            M{(stats.ecocashRevenue + stats.ottDirectRevenue).toFixed(2)}
          </div>
          <p className="text-[10px] font-mono text-slate-500">
            {stats.ecocashCount} EcoCash · {stats.ottDirectCount} Direct PIN
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest, phone, email, M-Pesa/EcoCash, hotspot, router, OTT PIN..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Access Mode Filter (Free vs Paid) */}
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                modeFilter === 'all' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Modes ({stats.total})
            </button>
            <button
              onClick={() => setModeFilter('free')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                modeFilter === 'free' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Mode ({stats.freeCount})
            </button>
            <button
              onClick={() => setModeFilter('paid')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                modeFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Paid Mode ({stats.paidCount})
            </button>
          </div>

          {/* Payment Method Filter */}
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setPaymentMethodFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                paymentMethodFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Methods
            </button>
            <button
              onClick={() => setPaymentMethodFilter('mpesa')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                paymentMethodFilter === 'mpesa' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              M-Pesa ({stats.mpesaCount})
            </button>
            <button
              onClick={() => setPaymentMethodFilter('ecocash')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                paymentMethodFilter === 'ecocash' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EcoCash ({stats.ecocashCount})
            </button>
            <button
              onClick={() => setPaymentMethodFilter('ottvoucher')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                paymentMethodFilter === 'ottvoucher' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct OTT ({stats.ottDirectCount})
            </button>
            <button
              onClick={() => setPaymentMethodFilter('free_wifi')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                paymentMethodFilter === 'free_wifi' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Wi-Fi ({stats.freeCount})
            </button>
          </div>

          {/* Country filter */}
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setCountryFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Regions
            </button>
            <button
              onClick={() => setCountryFilter('+266')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === '+266' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇱🇸 (+266)
            </button>
            <button
              onClick={() => setCountryFilter('+27')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                countryFilter === '+27' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇿🇦 (+27)
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
              <th className="py-2.5 px-3">MOBILE &amp; EMAIL</th>
              <th className="py-2.5 px-3">MODE &amp; PAYMENT METHOD</th>
              <th className="py-2.5 px-3">PACKAGE &amp; PRICE</th>
              <th className="py-2.5 px-3">HOTSPOT LOCATION &amp; ROUTER</th>
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
                const comm = resolveLeadCommercial(lead);

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
                          <div className="text-[10px] text-slate-500">
                            MAC: {lead.clientMac} · {lead.deviceType}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mobile & Email */}
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
                      <div className="flex items-center gap-1 text-[10px] text-amber-300/90 mt-0.5">
                        <Mail className="w-2.5 h-2.5 text-amber-400/80 shrink-0" />
                        <span className="truncate max-w-[165px]">{lead.email || 'Optional (Not entered)'}</span>
                      </div>
                    </td>

                    {/* Access Mode & Payment Method */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col items-start gap-1">
                        {comm.accessType === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span>PAID MODE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <span>FREE MODE</span>
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-bold ${
                            comm.paymentMethod === 'mpesa'
                              ? 'text-rose-400'
                              : comm.paymentMethod === 'ecocash'
                              ? 'text-blue-400'
                              : comm.paymentMethod === 'ottvoucher'
                              ? 'text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {comm.paymentMethodLabel}
                        </span>
                      </div>
                    </td>

                    {/* Package & Price */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-sm font-black tabular-nums ${
                            comm.amount > 0 ? 'text-emerald-400' : 'text-cyan-300'
                          }`}
                        >
                          M{comm.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">{comm.currency}</span>
                      </div>
                      <div className="text-[10px] text-white font-semibold truncate max-w-[175px]">
                        {comm.planName}
                      </div>
                      {comm.voucherPin && (
                        <div className="text-[9px] text-amber-300/90 font-mono truncate max-w-[175px]">
                          OTT PIN: {comm.voucherPin}
                        </div>
                      )}
                    </td>

                    {/* Hotspot Location & Router */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="text-white font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f05e17] shrink-0" />
                        <span>{comm.siteName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Router: {comm.routerName}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-amber-300 border border-slate-700">
                          {comm.district}
                        </span>
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
                              : comm.accessType === 'paid'
                              ? 'Paid OTT Active'
                              : 'Free Wi-Fi Active'}
                          </span>
                        </span>
                        <div className="text-[9px] text-slate-500">
                          {comm.accessType === 'paid' ? comm.paymentMethodLabel : 'Step 1 Lead → Step 2 Free Login'}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRegrantFreeSession(lead)}
                          className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors flex items-center gap-1"
                          title="Refresh guest Wi-Fi session"
                        >
                          <Zap className="w-3 h-3 fill-current" />
                          <span>Authorize</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditLeadModal(lead)}
                          className="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Edit guest lead details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteLeadId === lead.id ? (
                          <div className="inline-flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead.id, lead.fullName)}
                              className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteLeadId(null)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteLeadId(lead.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete guest lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                    <div>No guest leads or transactions matching current filters.</div>
                    <button
                      onClick={handleSeedSampleLead}
                      className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs"
                    >
                      Generate Sample Lead / Transaction
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

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1b233a] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Edit2 className="w-4 h-4 text-[#f05e17]" />
                <span>Edit Guest Subscriber Lead</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Region</label>
                  <select
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value as '+266' | '+27')}
                    className="w-full px-2 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  >
                    <option value="+266">+266 (LS)</option>
                    <option value="+27">+27 (ZA)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">Mobile Digits</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Verified Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Router Name</label>
                  <input
                    type="text"
                    value={editRouterName}
                    onChange={(e) => setEditRouterName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1b233a]">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold"
                >
                  Save Lead Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
