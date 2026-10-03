import React, { useState } from 'react';
import { 
  Repeat, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ArrowRight, 
  Server, 
  Wifi, 
  Users, 
  Play,
  Layers
} from 'lucide-react';
import { RouterDevice, Voucher } from '../../types';

interface RoamingViewProps {
  routers: RouterDevice[];
  vouchers: Voucher[];
  onRedeemVoucher: (code: string, mac: string, hostname?: string, siteName?: string) => any;
  currency: string;
}

export const RoamingView: React.FC<RoamingViewProps> = ({
  routers,
  vouchers,
  onRedeemVoucher,
  currency,
}) => {
  const [sourceRouterId, setSourceRouterId] = useState<string>(routers[0]?.id || '');
  const [destRouterId, setDestRouterId] = useState<string>(routers[1]?.id || '');
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>(vouchers[0]?.code || '');
  const [roamingResults, setRoamingResults] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const sourceRouter = routers.find(r => r.id === sourceRouterId) || routers[0];
  const destRouter = routers.find(r => r.id === destRouterId) || routers[1];

  const runRoamingSimulation = () => {
    if (!selectedVoucherCode) return;
    setIsSimulating(true);
    setRoamingResults([]);

    const steps: any[] = [];

    // Step 1: Connect at Source Site
    setTimeout(() => {
      const res1 = onRedeemVoucher(selectedVoucherCode, 'AA:11:22:33:44:55', 'Client-Phone-Nomad', sourceRouter.siteName);
      steps.push({
        step: 1,
        title: `Initial Connection at ${sourceRouter.siteName}`,
        site: sourceRouter.siteName,
        mac: 'AA:11:22:33:44:55',
        success: res1.success,
        message: res1.message,
        entitlement: 'Initial entitlement granted centrally in PostgreSQL'
      });
      setRoamingResults([...steps]);

      // Step 2: User moves to Destination Site and attempts connection with same device
      setTimeout(() => {
        const res2 = onRedeemVoucher(selectedVoucherCode, 'AA:11:22:33:44:55', 'Client-Phone-Nomad', destRouter.siteName);
        steps.push({
          step: 2,
          title: `Roamed to ${destRouter.siteName}`,
          site: destRouter.siteName,
          mac: 'AA:11:22:33:44:55',
          success: res2.success,
          message: res2.message,
          entitlement: 'Recognized by Central RADIUS without secondary payment!'
        });
        setRoamingResults([...steps]);

        // Step 3: Anti-abuse device limit check across locations
        setTimeout(() => {
          // Attempt 2nd device
          const res3 = onRedeemVoucher(selectedVoucherCode, 'BB:22:33:44:55:66', 'Client-Laptop', destRouter.siteName);
          steps.push({
            step: 3,
            title: `Second Device (Laptop) at ${destRouter.siteName}`,
            site: destRouter.siteName,
            mac: 'BB:22:33:44:55:66',
            success: res3.success,
            message: res3.message,
            entitlement: 'Allowed within 2-device limit'
          });
          setRoamingResults([...steps]);

          // Attempt 3rd unauthorized device (fraud/sharing check)
          setTimeout(() => {
            const res4 = onRedeemVoucher(selectedVoucherCode, 'CC:99:99:99:99:99', 'Unauthorized-Friend-Device', sourceRouter.siteName);
            steps.push({
              step: 4,
              title: `Third Device Rejected at ${sourceRouter.siteName}`,
              site: sourceRouter.siteName,
              mac: 'CC:99:99:99:99:99',
              success: res4.success,
              message: res4.message,
              entitlement: 'Blocked by Central RADIUS: Device quota strictly enforced globally!'
            });
            setRoamingResults([...steps]);
            setIsSimulating(false);
          }, 600);
        }, 600);
      }, 700);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Connected Hotspots Global Roaming Engine</h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Central FreeRADIUS + PostgreSQL architecture: One voucher entitlement spans cafes, buses, communities, and stadiums
        </p>
      </div>

      {/* Roaming Architecture Diagram Box */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#f05e17]" />
            <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
              CENTRAL AUTHENTICATION TOPOLOGY
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">RADIUS RFC 2865 / 2866</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-center">
          <div className="p-4 bg-[#161d31] rounded-xl border border-[#232d42] space-y-1">
            <span className="text-2xl">☕</span>
            <h3 className="font-bold text-white">Location A: Maseru Mall</h3>
            <p className="text-[11px] text-slate-400">MikroTik hAP ax³ (SSID: T-Connect)</p>
            <div className="text-[10px] text-emerald-400 pt-2 border-t border-[#232d42]">
              RADIUS Auth Port 1812
            </div>
          </div>

          <div className="p-4 bg-[#1b233a] rounded-xl border border-[#f05e17]/50 space-y-1 relative">
            <div className="w-8 h-8 rounded-full bg-[#f05e17] text-white flex items-center justify-center mx-auto mb-1">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white">Central FreeRADIUS + Postgres</h3>
            <p className="text-[11px] text-slate-300">hub.tconnect.co.ls (10.99.0.1)</p>
            <div className="text-[10px] text-[#f05e17] font-bold pt-2 border-t border-[#2e3b5b]">
              Global Device Quotas &amp; Timers
            </div>
          </div>

          <div className="p-4 bg-[#161d31] rounded-xl border border-[#232d42] space-y-1">
            <span className="text-2xl">🚌</span>
            <h3 className="font-bold text-white">Location B: Maluti Bus #42</h3>
            <p className="text-[11px] text-slate-400">Teltonika RUTX50 (SSID: T-Connect)</p>
            <div className="text-[10px] text-emerald-400 pt-2 border-t border-[#232d42]">
              RADIUS Auth Port 1812
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Roaming Verification Simulator */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-5">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
            INTERACTIVE ROAMING &amp; ANTI-SHARING TESTER
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Demonstrate that a customer who paid at Site A connects at Site B on the same SSID without paying again, while strictly rejecting unauthorized 3rd devices.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Origin Site (Location A)</label>
            <select
              value={sourceRouterId}
              onChange={(e) => setSourceRouterId(e.target.value)}
              className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>{r.siteName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Roam Target (Location B)</label>
            <select
              value={destRouterId}
              onChange={(e) => setDestRouterId(e.target.value)}
              className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>{r.siteName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Select Voucher Token</label>
            <select
              value={selectedVoucherCode}
              onChange={(e) => setSelectedVoucherCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
            >
              {vouchers.map((v) => (
                <option key={v.id} value={v.code}>
                  {v.code} ({v.planName}, {v.deviceLimit} Dev Max)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={runRoamingSimulation}
          disabled={isSimulating}
          className="px-5 py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isSimulating ? 'Verifying Central Roaming...' : 'Run Roaming Acceptance Test'}</span>
        </button>

        {/* Roaming Simulation Step-by-Step Ledger */}
        <div className="bg-[#0a0e17] rounded-xl border border-[#1b233a] p-4 space-y-3 font-mono text-xs">
          {roamingResults.length === 0 ? (
            <p className="text-slate-500 text-center py-6">
              Click &quot;Run Roaming Acceptance Test&quot; to execute the multi-location verification sequence.
            </p>
          ) : (
            roamingResults.map((res, i) => (
              <div
                key={i}
                className="p-3 bg-[#121929] rounded-lg border border-[#1e273d] flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {res.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-white font-bold">{res.title}</h4>
                    <p className={`text-[11px] mt-0.5 ${res.success ? 'text-slate-300' : 'text-rose-300'}`}>
                      {res.message}
                    </p>
                    <div className="text-[10px] text-slate-500 mt-1">
                      MAC: {res.mac} · Entitlement: <strong className="text-slate-400">{res.entitlement}</strong>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                  res.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {res.success ? 'ACCESS-ACCEPT' : 'ACCESS-REJECT'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
