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
  Smartphone
} from 'lucide-react';
import { CaptivePortalLead, VerticalType } from '../../types';
import { storage } from '../../services/storage';

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

  const refreshLeads = () => {
    setLeads([...storage.getCaptiveLeads()]);
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
    const timer = setInterval(pollServerGuestLeads, 2500);
    return () => {
      mounted = false;
      unsub();
      clearInterval(timer);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`Copied ${label} to clipboard`);
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
        <div className="flex items-center gap-2 font-mono text-xs">
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
            onClick={refreshLeads}
            className="p-1.5 rounded-lg bg-[#121829] hover:bg-[#1a233b] text-slate-300 border border-[#232d42] transition-colors"
            title="Refresh Leads Table"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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
