import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Upload,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  HardDrive,
  Sparkles,
  Trash2,
  Edit3,
  ExternalLink,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Film,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { SponsorAdConfig, VideoAdItem, VerticalType } from '../../types';
import { storage, STARTER_VIDEO_AD_LIBRARY } from '../../services/storage';

interface UploadedServerVideo {
  name: string;
  url: string;
  path: string;
  sizeKb: number;
  uploadedAt: string;
}

const SCOPE_OPTIONS: Array<{ id: VerticalType | 'all'; label: string; badgeClass: string }> = [
  { id: 'all', label: 'All Scopes (Global Default)', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'hotspot', label: 'Public Hotspots', badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'community', label: 'Villages / Communities', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'park', label: 'Public Parks', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { id: 'bus', label: 'Transit Buses', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'stadium', label: 'Sports Stadiums', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
];

export const VideoAdManagerPanel: React.FC = () => {
  const [config, setConfig] = useState<SponsorAdConfig>(() => storage.getSponsorAdConfig());
  const [serverVideos, setServerVideos] = useState<UploadedServerVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // New / Edit Video Campaign Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [targetScope, setTargetScope] = useState<VerticalType | 'all'>('hotspot');
  const [watchMode, setWatchMode] = useState<'full_video' | 'skip_after_sec'>('full_video');
  const [skipAfterSec, setSkipAfterSec] = useState<number>(5);

  // Simulator State
  const [previewScope, setPreviewScope] = useState<VerticalType>('hotspot');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [simTriggerType, setSimTriggerType] = useState<'post_auth' | '3h_elapsed' | '2gb_used'>('post_auth');
  const [simElapsedSec, setSimElapsedSec] = useState(0);
  const [simVideoDurationSec, setSimVideoDurationSec] = useState(15);
  const [simUnlocked, setSimUnlocked] = useState(false);
  const [simMuted, setSimMuted] = useState(true);
  const simVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const videoLibrary: VideoAdItem[] = Array.isArray(config.videoLibrary) && config.videoLibrary.length > 0
    ? config.videoLibrary
    : STARTER_VIDEO_AD_LIBRARY;

  const fetchServerVideos = () => {
    fetch('/api/videos')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.videos)) {
          setServerVideos(data.videos);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchServerVideos();
    fetch('/api/portal/video-ads')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.sponsorAd) {
          setConfig((prev) => ({
            ...prev,
            ...data.sponsorAd,
            videoLibrary: Array.isArray(data.sponsorAd.videoLibrary) && data.sponsorAd.videoLibrary.length > 0
              ? data.sponsorAd.videoLibrary
              : prev.videoLibrary
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Resolve which video ad is being previewed in the simulator
  const activePreviewAd: VideoAdItem = React.useMemo(() => {
    if (previewVideoId) {
      const explicit = videoLibrary.find((v) => v.id === previewVideoId);
      if (explicit) return explicit;
    }
    const normScope = previewScope === 'village' ? 'community' : previewScope;
    return (
      videoLibrary.find((v) => v.enabled && (v.targetScope === normScope || v.targetScope === previewScope)) ||
      videoLibrary.find((v) => v.enabled && v.targetScope === 'all') ||
      videoLibrary[0] ||
      STARTER_VIDEO_AD_LIBRARY[0]
    );
  }, [videoLibrary, previewScope, previewVideoId]);

  // Reset simulator countdown whenever previewed ad or trigger changes
  useEffect(() => {
    setSimElapsedSec(0);
    setSimUnlocked(false);
    if (simVideoRef.current) {
      simVideoRef.current.currentTime = 0;
      simVideoRef.current.play().catch(() => {});
    }
  }, [activePreviewAd?.id, simTriggerType, previewScope]);

  // Simulator 1-second timer
  useEffect(() => {
    if (!activePreviewAd) return;
    const mode = activePreviewAd.watchMode || 'full_video';
    const skipTarget = Math.max(1, Number(activePreviewAd.skipAfterSec) || 5);
    const timer = setInterval(() => {
      setSimElapsedSec((prev) => {
        const next = prev + 1;
        if (mode === 'skip_after_sec' && next >= skipTarget) {
          setSimUnlocked(true);
        } else if (mode === 'full_video' && next >= Math.max(simVideoDurationSec, 15)) {
          setSimUnlocked(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activePreviewAd, simVideoDurationSec]);

  const persistConfig = (nextConfig: SponsorAdConfig, message = 'Video ad campaign & 3h / 2GB rules pushed live!') => {
    setConfig(nextConfig);
    storage.updateSponsorAdConfig(nextConfig);
    setSaveSuccess(message);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!/\.(mp4|webm|mov|m4v)$/i.test(file.name) && !file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file (.mp4, .webm, or .mov).');
      return;
    }

    if (file.size > 45 * 1024 * 1024) {
      setUploadError('Video file exceeds 45 MB limit. Short 10–30 second MP4 spots (under 25 MB) are recommended for fast captive portal loading.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }
        setVideoUrl(data.url);
        if (!title.trim()) {
          setTitle(file.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]+/g, ' '));
        }
        setUploadStatus(`Uploaded ${data.filename} (${data.sizeKb} KB) to /public/videos/`);
        fetchServerVideos();
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload video file to server.');
        setUploadStatus(null);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      setUploadError('Failed to read selected video file.');
      setUploadStatus(null);
    };
    reader.readAsDataURL(file);
  };

  const resetCampaignForm = () => {
    setEditingId(null);
    setTitle('');
    setSponsorName('');
    setHeadline('');
    setDescription('');
    setVideoUrl('');
    setDestinationUrl('');
    setTargetScope('hotspot');
    setWatchMode('full_video');
    setSkipAfterSec(5);
    setUploadStatus(null);
    setUploadError(null);
  };

  const handleSaveCampaignItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setUploadError('Please upload a video file or provide a direct .mp4 / .webm video URL.');
      return;
    }

    const cleanItem: VideoAdItem = {
      id: editingId || `vid_${Date.now()}`,
      title: title.trim() || `${sponsorName.trim() || 'Sponsor'} Video Ad`,
      sponsorName: sponsorName.trim() || 'T-Connect Sponsor',
      headline: headline.trim() || 'High-Speed Starlink Wi-Fi Sponsor',
      description: description.trim() || 'Thank you for watching our short partner message.',
      videoUrl: videoUrl.trim(),
      destinationUrl: destinationUrl.trim(),
      targetScope,
      enabled: true,
      watchMode,
      skipAfterSec: Number(skipAfterSec) || 5,
      uploadedAt: new Date().toISOString().slice(0, 10),
      impressions: editingId
        ? videoLibrary.find((v) => v.id === editingId)?.impressions || 0
        : 0
    };

    const nextLib = editingId
      ? videoLibrary.map((v) => (v.id === editingId ? cleanItem : v))
      : [cleanItem, ...videoLibrary];

    const nextConfig: SponsorAdConfig = {
      ...config,
      enabled: true,
      sponsorName: cleanItem.sponsorName,
      headline: cleanItem.headline,
      description: cleanItem.description,
      videoUrl: cleanItem.videoUrl,
      destinationUrl: cleanItem.destinationUrl,
      watchMode: cleanItem.watchMode,
      countdownDurationSec: cleanItem.skipAfterSec,
      videoLibrary: nextLib
    };

    persistConfig(
      nextConfig,
      editingId ? `Updated "${cleanItem.title}"!` : `Added "${cleanItem.title}" to Video Ad Library!`
    );
    setPreviewVideoId(cleanItem.id);
    resetCampaignForm();
  };

  const handleEditItem = (item: VideoAdItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSponsorName(item.sponsorName);
    setHeadline(item.headline);
    setDescription(item.description);
    setVideoUrl(item.videoUrl);
    setDestinationUrl(item.destinationUrl || '');
    setTargetScope(item.targetScope);
    setWatchMode(item.watchMode);
    setSkipAfterSec(item.skipAfterSec || 5);
  };

  const handleToggleItemEnabled = (id: string) => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, 'Updated active video selection.');
  };

  const handleChangeItemScope = (id: string, newScope: VerticalType | 'all') => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, targetScope: newScope } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, `Assigned video to ${newScope.toUpperCase()} scope.`);
  };

  const handleChangeItemWatchMode = (id: string, mode: 'full_video' | 'skip_after_sec') => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, watchMode: mode } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, 'Updated video watch policy.');
  };

  const handleDeleteItem = (id: string) => {
    const nextLib = videoLibrary.filter((v) => v.id !== id);
    persistConfig({ ...config, videoLibrary: nextLib }, 'Removed video campaign from library.');
    if (previewVideoId === id) setPreviewVideoId(null);
  };

  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://169.58.98.92:3000';
  const hoursVal = Math.max(1, Number(config.retriggerEveryHours) || 3);
  const gbVal = Math.max(0.5, Number(config.retriggerEveryGb) || 2);
  const bytesVal = Math.round(gbVal * 1073741824);
  const hhStr = String(hoursVal).padStart(2, '0');

  const mikrotikScript = [
    `# T-Connect Post-Auth & Recurring (${hoursVal}h / ${gbVal}GB) Video Ad Enforcement (RouterOS v7)`,
    `/tool fetch url="${hostOrigin}/api/portal/router-login.html" dst-path="hotspot/login.html" check-certificate=no`,
    `/tool fetch url="${hostOrigin}/api/portal/router-alogin.html" dst-path="hotspot/alogin.html" check-certificate=no`,
    `/ip hotspot user profile set [find] advertise=yes advertise-url="${hostOrigin}/api/portal/video-ad.html?reason=retrigger" advertise-interval=${hhStr}:00:00 advertise-timeout=00:02:00`,
    `/system scheduler remove [find name="tc-video-ad-quota-guard"]`,
    `/system scheduler add name="tc-video-ad-quota-guard" interval=1m on-event=":foreach i in=[/ip hotspot active find] do={ :local b ([/ip hotspot active get \\$i bytes-in] + [/ip hotspot active get \\$i bytes-out]); :if (\\$b >= ${bytesVal}) do={ /ip hotspot active remove \\$i } }" comment="T-Connect ${gbVal}GB Video Ad Checkpoint"`
  ].join('\n');

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* =================================================================== */}
      {/* TOP BAR: GLOBAL POST-AUTH & 3-HOUR / 2 GB RE-TRIGGER RULES          */}
      {/* =================================================================== */}
      <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#232d42] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-white">
                  Video Advertisements &amp; Recurring Checkpoint Manager
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Post-Auth + {hoursVal}h / {gbVal}GB Auto-Trigger
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload short MP4/WebM video ads, choose which videos are active per scope (Hotspots, Villages, Parks, Buses, Stadiums), and automatically re-play ads every {hoursVal} hours or {gbVal} GB of usage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => persistConfig({ ...config, enabled: !config.enabled })}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                config.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{config.enabled ? 'Video Ads Enabled' : 'Video Ads Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => persistConfig(config)}
              className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save &amp; Push to Routers</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* 3 Trigger Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trigger 1: Immediate Post-Auth */}
          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-emerald-500/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Trigger 1 · Immediate</div>
              <div className="text-white font-bold text-xs mt-0.5">Upon Authentication &amp; Connect</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Plays immediately after a user connects via 16-digit OTT Voucher, EcoCash, or Free Wi-Fi before opening the internet.
              </p>
            </div>
          </div>

          {/* Trigger 2: Time Checkpoint (Every 3 Hours) */}
          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-amber-500/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Trigger 2 · Session Time</div>
                <div className="text-white font-bold text-xs mt-0.5">Play Again Every {hoursVal} Hours</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  MikroTik <code className="text-amber-300">advertise-interval</code> intercepts active sessions every {hoursVal}h to play the next video spot.
                </p>
              </div>
            </div>
            <select
              value={hoursVal}
              onChange={(e) => setConfig((prev) => ({ ...prev, retriggerEveryHours: Number(e.target.value) }))}
              className="px-2.5 py-1.5 bg-[#0b0f1a] border border-amber-500/40 rounded-lg text-amber-300 font-bold text-xs focus:outline-none cursor-pointer shrink-0"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={3}>3 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={6}>6 Hours</option>
              <option value={12}>12 Hours</option>
            </select>
          </div>

          {/* Trigger 3: Data Usage Checkpoint (Every 2 GB) */}
          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-cyan-500/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Trigger 3 · Data Usage</div>
                <div className="text-white font-bold text-xs mt-0.5">Play Again Every {gbVal} GB Used</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Monitors active session byte counters (<code className="text-cyan-300">bytes-in + bytes-out</code>) and triggers the video ad at {gbVal} GB.
                </p>
              </div>
            </div>
            <select
              value={gbVal}
              onChange={(e) => setConfig((prev) => ({ ...prev, retriggerEveryGb: Number(e.target.value) }))}
              className="px-2.5 py-1.5 bg-[#0b0f1a] border border-cyan-500/40 rounded-lg text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer shrink-0"
            >
              <option value={0.5}>0.5 GB</option>
              <option value={1}>1 GB</option>
              <option value={2}>2 GB</option>
              <option value={3}>3 GB</option>
              <option value={5}>5 GB</option>
              <option value={10}>10 GB</option>
            </select>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN 12-COL GRID: LEFT (UPLOAD & LIBRARY) | RIGHT (LIVE SIMULATOR)  */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLUMNS: UPLOAD NEW VIDEO AD + VIDEO LIBRARY */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. UPLOAD / CREATE VIDEO CAMPAIGN CARD */}
          <form
            onSubmit={handleSaveCampaignItem}
            className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#232d42] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#f05e17]" />
                <h3 className="text-sm font-extrabold text-white">
                  {editingId ? 'Edit Video Ad Campaign' : 'Upload & Add New Video Advertisement'}
                </h3>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetCampaignForm}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* File Dropzone / Upload Button */}
            <div className="p-4 rounded-xl bg-[#141b2d] border border-dashed border-slate-600 hover:border-[#f05e17] transition-colors space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-white font-bold block">
                    Upload Short Video File (.MP4 / .WebM) to VPS
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Saved directly to <code className="text-amber-300">/public/videos/</code> for instant local playback on MikroTik &amp; APs
                  </span>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Choose Video File'}</span>
                  </button>
                </div>
              </div>

              {uploadStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px]">
                  {uploadError}
                </div>
              )}

              {/* Server Uploaded Videos Quick-Select */}
              {serverVideos.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                    Uploaded Files in /public/videos/ (Click to Use):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {serverVideos.map((sv) => (
                      <button
                        key={sv.url}
                        type="button"
                        onClick={() => {
                          setVideoUrl(sv.url);
                          if (!title.trim()) setTitle(sv.name.replace(/\.[a-zA-Z0-9]+$/, ''));
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer ${
                          videoUrl === sv.url
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                            : 'bg-[#0b0f1a] border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <Film className="w-3 h-3 text-amber-400" />
                        <span>{sv.name}</span>
                        <span className="text-[10px] text-slate-400">({sv.sizeKb} KB)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Or Direct Video URL Input */}
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Video Source URL (Auto-filled on upload, or paste direct .mp4 / .webm link) *
                </label>
                <input
                  type="text"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="/videos/my_sponsor_ad.mp4 or https://.../spot.mp4"
                  className="w-full px-3 py-2 bg-[#0b0f1a] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>
            </div>

            {/* Campaign Metadata & Scope Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Alliance Insurance 15s Spot"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Sponsor Brand Name *</label>
                <input
                  type="text"
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Alliance Insurance Lesotho"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Ad Headline *</label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Protect Your Journey Across Lesotho"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Click-Through Website URL (Optional)</label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://alliance.co.ls"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Short Promotional Message</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief sponsor message shown beneath the video player..."
                className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
              />
            </div>

            {/* Scope Assignment & Watch Behavior */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Assign to Scope</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as VerticalType | 'all')}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17] cursor-pointer"
                >
                  {SCOPE_OPTIONS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Subscriber Watch Rule</label>
                <select
                  value={watchMode}
                  onChange={(e) => setWatchMode(e.target.value as 'full_video' | 'skip_after_sec')}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17] cursor-pointer"
                >
                  <option value="full_video">Require Full Video Watch</option>
                  <option value="skip_after_sec">Allow Skip After Timer</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Skip Timer (If Skippable)</label>
                <select
                  value={skipAfterSec}
                  disabled={watchMode === 'full_video'}
                  onChange={(e) => setSkipAfterSec(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] disabled:opacity-40 rounded-xl text-white focus:outline-none focus:border-[#f05e17] cursor-pointer"
                >
                  <option value={3}>Skip after 3 seconds</option>
                  <option value={5}>Skip after 5 seconds</option>
                  <option value={10}>Skip after 10 seconds</option>
                  <option value={15}>Skip after 15 seconds</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingId ? 'Update Video Campaign' : 'Add Video to Active Library'}</span>
              </button>
            </div>
          </form>

          {/* 2. VIDEO AD LIBRARY & SCOPE SELECTOR ("WHICH ONES WE CAN USE") */}
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232d42] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Uploaded &amp; Available Video Campaigns ({videoLibrary.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toggle which video ads are active and assign each video to a specific network scope.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-400">
                {videoLibrary.filter((v) => v.enabled).length} Active
              </span>
            </div>

            <div className="space-y-3">
              {videoLibrary.map((item) => {
                const scopeMeta = SCOPE_OPTIONS.find((s) => s.id === item.targetScope) || SCOPE_OPTIONS[0];
                const isSelectedPreview = activePreviewAd?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.enabled
                        ? isSelectedPreview
                          ? 'bg-[#161f35] border-amber-500/50'
                          : 'bg-[#141b2d] border-[#26324d]'
                        : 'bg-[#0b0f1a]/60 border-slate-800 opacity-65'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setPreviewVideoId(item.id)}
                        className="w-20 h-14 rounded-lg bg-black border border-white/15 overflow-hidden relative shrink-0 group cursor-pointer"
                        title="Click to preview this video in the phone simulator"
                      >
                        <video
                          src={item.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-xs truncate">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${scopeMeta.badgeClass}`}>
                            {scopeMeta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {item.watchMode === 'full_video' ? 'Full Watch Required' : `Skip after ${item.skipAfterSec}s`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          <span className="text-emerald-400 font-bold">{item.sponsorName}:</span> {item.headline}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3">
                          <span>Source: {item.videoUrl.startsWith('/videos/') ? item.videoUrl : 'External MP4'}</span>
                          <span>•</span>
                          <span>{(item.impressions || 0).toLocaleString()} plays</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls: Scope Picker, Watch Mode Toggle, Active Switch, Preview, Edit, Delete */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      <select
                        value={item.targetScope}
                        onChange={(e) => handleChangeItemScope(item.id, e.target.value as VerticalType | 'all')}
                        className="px-2 py-1.5 bg-[#0b0f1a] border border-slate-700 rounded-lg text-[11px] text-slate-200 cursor-pointer"
                        title="Assign Scope"
                      >
                        {SCOPE_OPTIONS.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          handleChangeItemWatchMode(
                            item.id,
                            item.watchMode === 'full_video' ? 'skip_after_sec' : 'full_video'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#0b0f1a] border border-slate-700 hover:border-slate-500 text-[10px] font-bold text-slate-300 cursor-pointer"
                        title="Toggle Full Watch vs Skip Timer"
                      >
                        {item.watchMode === 'full_video' ? 'Full Watch' : `Skip (${item.skipAfterSec}s)`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleItemEnabled(item.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                          item.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.enabled ? 'USE ACTIVE' : 'PAUSED'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Edit Video Campaign"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                        title="Delete Video Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: LIVE VIDEO AD PHONE SIMULATOR & ROUTEROS SCRIPT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232d42] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#f05e17]" />
                <span className="font-extrabold text-white text-sm">Live Subscriber Video Ad Simulator</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimElapsedSec(0);
                  setSimUnlocked(false);
                  if (simVideoRef.current) {
                    simVideoRef.current.currentTime = 0;
                    simVideoRef.current.play().catch(() => {});
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#161d31] hover:bg-[#1f2942] text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replay Ad</span>
              </button>
            </div>

            {/* Scope & Trigger Mode Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Test Scope Assignment
                </label>
                <select
                  value={previewScope}
                  onChange={(e) => {
                    setPreviewVideoId(null);
                    setPreviewScope(e.target.value as VerticalType);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white text-xs cursor-pointer"
                >
                  <option value="hotspot">Public Hotspots</option>
                  <option value="community">Villages / Communities</option>
                  <option value="park">Public Parks</option>
                  <option value="bus">Transit Buses</option>
                  <option value="stadium">Sports Stadiums</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Simulate Trigger Event
                </label>
                <select
                  value={simTriggerType}
                  onChange={(e) => setSimTriggerType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-amber-300 font-bold text-xs cursor-pointer"
                >
                  <option value="post_auth">1. Immediate Post-Auth</option>
                  <option value="3h_elapsed">2. After {hoursVal} Hours Connected</option>
                  <option value="2gb_used">3. After {gbVal} GB Data Used</option>
                </select>
              </div>
            </div>

            {/* Simulated Phone Frame */}
            <div className="mx-auto w-full max-w-[330px] bg-black border-4 border-slate-700 rounded-[32px] overflow-hidden shadow-2xl relative font-sans">
              <div className="w-24 h-4 bg-slate-800 mx-auto rounded-b-xl z-20 relative flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>

              <div className="p-4 space-y-3.5 text-white min-h-[450px] flex flex-col justify-between bg-gradient-to-b from-[#0b101d] to-black">
                {/* Status Header */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    {simTriggerType === 'post_auth'
                      ? 'Post-Auth Sponsor Video'
                      : simTriggerType === '3h_elapsed'
                      ? `${hoursVal}-Hour Checkpoint Ad`
                      : `${gbVal} GB Usage Checkpoint Ad`}
                  </span>
                  <span className={simUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                    {simUnlocked
                      ? 'Ad Complete ✓'
                      : activePreviewAd.watchMode === 'skip_after_sec'
                      ? `Skip in ${Math.max(0, (activePreviewAd.skipAfterSec || 5) - simElapsedSec)}s`
                      : `${Math.max(0, Math.ceil(simVideoDurationSec - simElapsedSec))}s left`}
                  </span>
                </div>

                {/* Video Player Card */}
                <div className="bg-[#121829] border border-white/15 rounded-2xl p-3 space-y-3 shadow-xl">
                  <div className="relative rounded-xl overflow-hidden bg-black border border-white/10">
                    <video
                      ref={simVideoRef}
                      key={activePreviewAd.videoUrl}
                      src={activePreviewAd.videoUrl}
                      playsInline
                      autoPlay
                      muted={simMuted}
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (dur && !isNaN(dur) && isFinite(dur)) {
                          setSimVideoDurationSec(Math.ceil(dur));
                        }
                      }}
                      onEnded={() => setSimUnlocked(true)}
                      onError={() => setSimUnlocked(true)}
                      className="w-full h-44 object-cover bg-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSimMuted((prev) => {
                          const next = !prev;
                          if (simVideoRef.current) simVideoRef.current.muted = next;
                          return next;
                        });
                      }}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/75 border border-white/25 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                    >
                      {simMuted ? <VolumeX className="w-3 h-3 text-amber-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                      <span>{simMuted ? 'Unmute' : 'Audio On'}</span>
                    </button>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-emerald-400 font-extrabold">
                      Sponsored by {activePreviewAd.sponsorName}
                    </div>
                    <h4 className="font-extrabold text-white text-sm leading-snug mt-0.5">
                      {activePreviewAd.headline}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                      {activePreviewAd.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={!simUnlocked}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {simUnlocked
                          ? 'Continue to High-Speed Internet \u2192'
                          : activePreviewAd.watchMode === 'skip_after_sec'
                          ? `Skip Ad & Continue in ${Math.max(0, (activePreviewAd.skipAfterSec || 5) - simElapsedSec)}s...`
                          : `Watching Video (${Math.max(0, Math.ceil(simVideoDurationSec - simElapsedSec))}s)...`}
                      </span>
                    </button>

                    {activePreviewAd.destinationUrl && (
                      <a
                        href={activePreviewAd.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-xl border border-[#f05e17]/50 bg-[#f05e17]/15 text-orange-200 font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <span>Visit {activePreviewAd.sponsorName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-center text-[10px] font-mono text-slate-400">
                  Next checkpoint: {hoursVal}h elapsed or {gbVal} GB consumed
                </div>
              </div>
            </div>
          </div>

          {/* MikroTik RouterOS Enforcement Script Card */}
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-white">
                  MikroTik RouterOS v7 Video Ad Sync Commands
                </h4>
                <p className="text-[10px] text-slate-400">
                  Automatically pushed on Save, or copy to run in WinBox Terminal
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(mikrotikScript);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2500);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#1f2942] border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy CLI'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#070a12] border border-slate-800 text-[10px] text-emerald-300 overflow-x-auto leading-relaxed">
              {mikrotikScript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
