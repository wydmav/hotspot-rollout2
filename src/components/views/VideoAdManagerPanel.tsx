import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Upload,
  Play,
  CheckCircle2,
  Clock,
  HardDrive,
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
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import { SponsorAdConfig, VideoAdItem, AdSlideItem, VerticalType } from '../../types';
import { storage, STARTER_VIDEO_AD_LIBRARY } from '../../services/storage';
import {
  resolveWalledGardenImageUrl,
  buildInlineFallbackSlideDataUri
} from './ScopeCaptivePortalBuilder';

interface UploadedServerVideo {
  name: string;
  url: string;
  path: string;
  sizeKb: number;
  uploadedAt: string;
}

interface UploadedServerPhoto {
  name: string;
  url: string;
  size?: number;
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
  const [serverPhotos, setServerPhotos] = useState<UploadedServerPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const initialCarouselItem = React.useMemo(() => {
    const lib = storage.getSponsorAdConfig().videoLibrary || STARTER_VIDEO_AD_LIBRARY;
    return (
      lib.find((v) => v.mediaType === 'image_carousel' && v.enabled) ||
      lib.find((v) => v.mediaType === 'image_carousel') ||
      null
    );
  }, []);

  // New / Edit Campaign Form State (Defaults to active Picture Series so admin can immediately upload/edit ad pictures)
  const [editingId, setEditingId] = useState<string | null>(() => initialCarouselItem?.id || null);
  const [mediaType, setMediaType] = useState<'video' | 'image_carousel'>(() =>
    initialCarouselItem ? 'image_carousel' : 'video'
  );
  const [title, setTitle] = useState(() => initialCarouselItem?.title || '');
  const [sponsorName, setSponsorName] = useState(() => initialCarouselItem?.sponsorName || '');
  const [headline, setHeadline] = useState(() => initialCarouselItem?.headline || '');
  const [description, setDescription] = useState(() => initialCarouselItem?.description || '');
  const [videoUrl, setVideoUrl] = useState(() => initialCarouselItem?.videoUrl || '');
  const [destinationUrl, setDestinationUrl] = useState(() => initialCarouselItem?.destinationUrl || '');
  const [slides, setSlides] = useState<AdSlideItem[]>(() =>
    initialCarouselItem?.slides && initialCarouselItem.slides.length > 0
      ? initialCarouselItem.slides
      : [
          {
            id: `slide_${Date.now()}_1`,
            imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80',
            redirectUrl: 'https://tconnect.co.ls',
            caption: 'Slide 1 — Tap to visit offer'
          }
        ]
  );
  const [targetScope, setTargetScope] = useState<VerticalType | 'all'>(
    () => initialCarouselItem?.targetScope || 'all'
  );
  const [watchMode, setWatchMode] = useState<'full_video' | 'skip_after_sec'>(
    () => initialCarouselItem?.watchMode || 'skip_after_sec'
  );
  const [skipAfterSec, setSkipAfterSec] = useState<number>(() => initialCarouselItem?.skipAfterSec || 5);

  // Simulator & Full-Screen Overlay State
  const [previewScope, setPreviewScope] = useState<VerticalType>('hotspot');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [simTriggerType, setSimTriggerType] = useState<'post_auth' | '3h_elapsed' | '2gb_used'>('post_auth');
  const [simElapsedSec, setSimElapsedSec] = useState(0);
  const [simVideoDurationSec, setSimVideoDurationSec] = useState(15);
  const [simUnlocked, setSimUnlocked] = useState(false);
  const [simMuted, setSimMuted] = useState(true);
  const [simSlideIdx, setSimSlideIdx] = useState(0);
  const [isFullScreenTestOpen, setIsFullScreenTestOpen] = useState(false);
  const simTouchStartXRef = useRef<number>(0);

  const simVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slideImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const fetchServerPhotos = () => {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.photos)) {
          setServerPhotos(data.photos);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchServerVideos();
    fetchServerPhotos();
    fetch('/api/portal/video-ads')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.sponsorAd) {
          const srvLib: VideoAdItem[] =
            Array.isArray(data.sponsorAd.videoLibrary) && data.sponsorAd.videoLibrary.length > 0
              ? data.sponsorAd.videoLibrary
              : videoLibrary;
          setConfig((prev) => ({
            ...prev,
            ...data.sponsorAd,
            videoLibrary: srvLib
          }));
          const activeCarousel =
            srvLib.find((v) => v.mediaType === 'image_carousel' && v.enabled) ||
            srvLib.find((v) => v.mediaType === 'image_carousel');
          if (activeCarousel) {
            setEditingId(activeCarousel.id);
            setMediaType('image_carousel');
            setTitle(activeCarousel.title);
            setSponsorName(activeCarousel.sponsorName);
            setHeadline(activeCarousel.headline);
            setDescription(activeCarousel.description);
            setVideoUrl(activeCarousel.videoUrl || '');
            setDestinationUrl(activeCarousel.destinationUrl || '');
            if (Array.isArray(activeCarousel.slides) && activeCarousel.slides.length > 0) {
              setSlides(activeCarousel.slides);
            }
            setTargetScope(activeCarousel.targetScope);
            setWatchMode(activeCarousel.watchMode);
            setSkipAfterSec(activeCarousel.skipAfterSec || 5);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Resolve which ad is being previewed in the simulator
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

  const isPreviewCarousel = activePreviewAd?.mediaType === 'image_carousel' && Array.isArray(activePreviewAd.slides) && activePreviewAd.slides.length > 0;
  const previewSlides: AdSlideItem[] = isPreviewCarousel ? (activePreviewAd.slides || []) : [];

  // Reset simulator countdown whenever previewed ad or trigger changes
  useEffect(() => {
    setSimElapsedSec(0);
    setSimUnlocked(false);
    setSimSlideIdx(0);
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
    const totalReqSec = isPreviewCarousel
      ? (mode === 'skip_after_sec' ? skipTarget : Math.max(activePreviewAd.durationSec || 8, 5))
      : (mode === 'skip_after_sec' ? skipTarget : Math.max(simVideoDurationSec, 15));

    const timer = setInterval(() => {
      setSimElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= totalReqSec) {
          setSimUnlocked(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activePreviewAd, simVideoDurationSec, isPreviewCarousel]);

  const persistConfig = (nextConfig: SponsorAdConfig, message = 'Full-screen ad campaigns & 3h / 2GB rules saved & pushed live to routers!') => {
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

  const commitSlidesToLibraryAndPersist = (
    updatedSlides: AdSlideItem[],
    toastMessage = 'Uploaded ad picture & synced live to all routers and guest phones!'
  ) => {
    const validSlides = updatedSlides.filter((s) => s.imageUrl && s.imageUrl.trim());
    if (validSlides.length === 0) return;

    const targetCampaignId =
      editingId ||
      videoLibrary.find((v) => v.mediaType === 'image_carousel' && v.enabled)?.id ||
      videoLibrary.find((v) => v.mediaType === 'image_carousel')?.id ||
      `ad_${Date.now()}`;

    const existingCampaign = videoLibrary.find((v) => v.id === targetCampaignId);
    const primaryDestination =
      destinationUrl.trim() ||
      existingCampaign?.destinationUrl ||
      validSlides[0]?.redirectUrl ||
      'https://tconnect.co.ls';

    const updatedItem: VideoAdItem = {
      id: targetCampaignId,
      title: title.trim() || existingCampaign?.title || 'T-Connect Lesotho Partner Deals (3-Picture Series)',
      sponsorName: sponsorName.trim() || existingCampaign?.sponsorName || 'T-Connect Lesotho Partners',
      headline: headline.trim() || existingCampaign?.headline || 'Slide Through Exclusive Partner Deals',
      description:
        description.trim() ||
        existingCampaign?.description ||
        'Slide right or left to view every picture, tap any picture to visit the partner offer, or tap X to close.',
      videoUrl: validSlides[0]?.imageUrl || existingCampaign?.videoUrl || '',
      destinationUrl: primaryDestination,
      mediaType: 'image_carousel',
      slides: validSlides.map((s, idx) => ({
        id: s.id || `slide_${idx + 1}`,
        imageUrl: s.imageUrl.trim(),
        redirectUrl: (s.redirectUrl || primaryDestination).trim(),
        caption: s.caption?.trim() || ''
      })),
      targetScope: targetScope || existingCampaign?.targetScope || 'all',
      enabled: true,
      watchMode: watchMode || existingCampaign?.watchMode || 'skip_after_sec',
      skipAfterSec: Number(skipAfterSec) || existingCampaign?.skipAfterSec || 5,
      durationSec: 8,
      uploadedAt: new Date().toISOString().slice(0, 10),
      impressions: existingCampaign?.impressions || 0,
      clicks: existingCampaign?.clicks || 0
    };

    const existsInLib = videoLibrary.some((v) => v.id === targetCampaignId);
    const nextLib = existsInLib
      ? videoLibrary.map((v) => (v.id === targetCampaignId ? updatedItem : v))
      : [updatedItem, ...videoLibrary];

    const nextConfig: SponsorAdConfig = {
      ...config,
      enabled: true,
      sponsorName: updatedItem.sponsorName,
      headline: updatedItem.headline,
      description: updatedItem.description,
      imageUrl: validSlides[0]?.imageUrl || config.imageUrl,
      videoUrl: updatedItem.videoUrl,
      destinationUrl: updatedItem.destinationUrl,
      mediaType: 'image_carousel',
      watchMode: updatedItem.watchMode,
      countdownDurationSec: updatedItem.skipAfterSec,
      videoLibrary: nextLib
    };

    setEditingId(targetCampaignId);
    setPreviewVideoId(targetCampaignId);
    persistConfig(nextConfig, toastMessage);
  };

  const handleSlideImageUpload = (slideId: string, file?: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadStatus(`Uploading picture ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `ad_slide_${Date.now()}_${file.name}`,
            base64Data
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload picture');
        }
        fetchServerPhotos();
        setSlides((prev) => {
          const nextSlides = prev.map((s) => (s.id === slideId ? { ...s, imageUrl: data.url } : s));
          commitSlidesToLibraryAndPersist(
            nextSlides,
            `Uploaded "${data.filename}" & synced live to MikroTik splash ad carousel!`
          );
          return nextSlides;
        });
        setUploadStatus(`Uploaded picture ${data.filename} to server & activated live on routers!`);
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload picture');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        id: `slide_${Date.now()}_${prev.length + 1}`,
        imageUrl: '',
        redirectUrl: destinationUrl || 'https://tconnect.co.ls',
        caption: `Picture ${prev.length + 1}`
      }
    ]);
  };

  const updateSlide = (id: string, patch: Partial<AdSlideItem>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSlide = (id: string) => {
    setSlides((prev) => {
      const next = prev.length > 1 ? prev.filter((s) => s.id !== id) : prev;
      commitSlidesToLibraryAndPersist(next, 'Removed slide & synced ad carousel to routers!');
      return next;
    });
  };

  const resetCampaignForm = () => {
    setEditingId(null);
    setMediaType('video');
    setTitle('');
    setSponsorName('');
    setHeadline('');
    setDescription('');
    setVideoUrl('');
    setDestinationUrl('');
    setSlides([
      {
        id: `slide_${Date.now()}_1`,
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80',
        redirectUrl: 'https://tconnect.co.ls',
        caption: 'Slide 1 — Tap to visit offer'
      }
    ]);
    setTargetScope('hotspot');
    setWatchMode('full_video');
    setSkipAfterSec(5);
    setUploadStatus(null);
    setUploadError(null);
  };

  const handleSaveCampaignItem = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (mediaType === 'video' && !videoUrl.trim()) {
      setUploadError('Please upload a video file or provide a direct .mp4 / .webm video URL.');
      return;
    }

    const validSlides = slides.filter((s) => s.imageUrl.trim());
    if (mediaType === 'image_carousel' && validSlides.length === 0) {
      setUploadError('Please add at least one picture URL or upload a picture for your series ad.');
      return;
    }

    const primaryDestination =
      destinationUrl.trim() ||
      (mediaType === 'image_carousel' && validSlides[0]?.redirectUrl ? validSlides[0].redirectUrl.trim() : 'https://tconnect.co.ls');

    const cleanItem: VideoAdItem = {
      id: editingId || `ad_${Date.now()}`,
      title: title.trim() || `${sponsorName.trim() || 'Sponsor'} ${mediaType === 'image_carousel' ? 'Picture Series' : 'Video Ad'}`,
      sponsorName: sponsorName.trim() || 'T-Connect Sponsor',
      headline: headline.trim() || 'Tap Anywhere on Screen to Visit Sponsor Offer',
      description: description.trim() || 'Full-screen post-authentication sponsor campaign.',
      videoUrl: mediaType === 'video' ? videoUrl.trim() : (validSlides[0]?.imageUrl || ''),
      destinationUrl: primaryDestination,
      mediaType,
      slides: mediaType === 'image_carousel'
        ? validSlides.map((s, idx) => ({
            id: s.id || `slide_${idx + 1}`,
            imageUrl: s.imageUrl.trim(),
            redirectUrl: (s.redirectUrl || primaryDestination).trim(),
            caption: s.caption?.trim() || ''
          }))
        : undefined,
      targetScope,
      enabled: true,
      watchMode,
      skipAfterSec: Number(skipAfterSec) || 5,
      durationSec: mediaType === 'image_carousel' ? 8 : 15,
      uploadedAt: new Date().toISOString().slice(0, 10),
      impressions: editingId ? videoLibrary.find((v) => v.id === editingId)?.impressions || 0 : 0,
      clicks: editingId ? videoLibrary.find((v) => v.id === editingId)?.clicks || 0 : 0
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
      mediaType: cleanItem.mediaType,
      watchMode: cleanItem.watchMode,
      countdownDurationSec: cleanItem.skipAfterSec,
      videoLibrary: nextLib
    };

    persistConfig(
      nextConfig,
      editingId
        ? `Updated "${cleanItem.title}" & pushed live to routers!`
        : `Saved "${cleanItem.title}" (${mediaType === 'image_carousel' ? `${validSlides.length} pictures` : 'Full-Screen Video'}) to active library!`
    );
    setEditingId(cleanItem.id);
    setPreviewVideoId(cleanItem.id);
  };

  const handleEditItem = (item: VideoAdItem) => {
    setEditingId(item.id);
    setMediaType(item.mediaType === 'image_carousel' ? 'image_carousel' : 'video');
    setTitle(item.title);
    setSponsorName(item.sponsorName);
    setHeadline(item.headline);
    setDescription(item.description);
    setVideoUrl(item.videoUrl || '');
    setDestinationUrl(item.destinationUrl || '');
    if (item.mediaType === 'image_carousel' && Array.isArray(item.slides) && item.slides.length > 0) {
      setSlides(item.slides);
    } else {
      setSlides([
        {
          id: `slide_${Date.now()}_1`,
          imageUrl: item.videoUrl || '',
          redirectUrl: item.destinationUrl || 'https://tconnect.co.ls',
          caption: item.headline || 'Slide 1'
        }
      ]);
    }
    setTargetScope(item.targetScope);
    setWatchMode(item.watchMode);
    setSkipAfterSec(item.skipAfterSec || 5);
  };

  const handleToggleItemEnabled = (id: string) => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, 'Updated active ad campaign status.');
  };

  const handleChangeItemScope = (id: string, newScope: VerticalType | 'all') => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, targetScope: newScope } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, `Assigned ad campaign to ${newScope.toUpperCase()} scope.`);
  };

  const handleChangeItemWatchMode = (id: string, mode: 'full_video' | 'skip_after_sec') => {
    const nextLib = videoLibrary.map((v) => (v.id === id ? { ...v, watchMode: mode } : v));
    persistConfig({ ...config, videoLibrary: nextLib }, 'Updated watch & skip policy.');
  };

  const handleDeleteItem = (id: string) => {
    const nextLib = videoLibrary.filter((v) => v.id !== id);
    persistConfig({ ...config, videoLibrary: nextLib }, 'Removed ad campaign from library.');
    if (previewVideoId === id) setPreviewVideoId(null);
  };

  const handleAdClickRedirect = (ad: VideoAdItem, slideIndex = 0) => {
    const slideUrl =
      ad.mediaType === 'image_carousel' && Array.isArray(ad.slides) && ad.slides[slideIndex]?.redirectUrl
        ? ad.slides[slideIndex].redirectUrl
        : ad.destinationUrl;
    const targetUrl = (slideUrl || ad.destinationUrl || 'https://tconnect.co.ls').trim();
    if (!targetUrl) return;
    storage.recordVideoAdClick(ad.id);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://169.58.98.92:3000';
  const hoursVal = Math.max(1, Number(config.retriggerEveryHours) || 3);
  const gbVal = Math.max(0.5, Number(config.retriggerEveryGb) || 2);
  const bytesVal = Math.round(gbVal * 1073741824);
  const hhStr = String(hoursVal).padStart(2, '0');

  const mikrotikScript = [
    `# T-Connect Full-Screen Post-Auth & Recurring (${hoursVal}h / ${gbVal}GB) Ad Enforcement (RouterOS v7)`,
    `/tool fetch url="${hostOrigin}/api/portal/router-login.html" dst-path="hotspot/login.html" check-certificate=no`,
    `/tool fetch url="${hostOrigin}/api/portal/router-alogin.html" dst-path="hotspot/alogin.html" check-certificate=no`,
    `/ip hotspot user profile set [find] advertise=yes advertise-url="${hostOrigin}/api/portal/video-ad.html?reason=retrigger" advertise-interval=${hhStr}:00:00 advertise-timeout=00:02:00`,
    `/system scheduler remove [find name="tc-video-ad-quota-guard"]`,
    `/system scheduler add name="tc-video-ad-quota-guard" interval=1m on-event=":foreach i in=[/ip hotspot active find] do={ :local b ([/ip hotspot active get \\$i bytes-in] + [/ip hotspot active get \\$i bytes-out]); :if (\\$b >= ${bytesVal}) do={ /ip hotspot active remove \\$i } }" comment="T-Connect ${gbVal}GB Ad Checkpoint"`
  ].join('\n');

  const currentSlide = previewSlides[simSlideIdx] || previewSlides[0];
  const currentClickRedirectUrl = isPreviewCarousel
    ? (currentSlide?.redirectUrl || activePreviewAd?.destinationUrl || 'https://tconnect.co.ls')
    : (activePreviewAd?.destinationUrl || 'https://tconnect.co.ls');

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* =================================================================== */}
      {/* FULL-SCREEN 100vw x 100vh OVERLAY TEST MODAL                        */}
      {/* =================================================================== */}
      {isFullScreenTestOpen && activePreviewAd && (
        <div
          className="fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden select-none"
          onTouchStart={(e) => {
            simTouchStartXRef.current = e.touches[0]?.clientX || 0;
          }}
          onTouchEnd={(e) => {
            if (!isPreviewCarousel || previewSlides.length <= 1) return;
            const dx = (e.changedTouches[0]?.clientX || 0) - simTouchStartXRef.current;
            if (Math.abs(dx) > 40) {
              if (dx < 0) {
                setSimSlideIdx((prev) => (prev + 1) % previewSlides.length);
              } else {
                setSimSlideIdx((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
              }
            }
          }}
        >
          {/* Edge-to-Edge Media: Horizontal Sliding Picture Track OR Video */}
          {isPreviewCarousel ? (
            <div
              className="flex w-full h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${simSlideIdx * 100}%)` }}
            >
              {previewSlides.map((sl, idx) => (
                <div key={sl.id || idx} className="w-screen h-screen shrink-0 relative bg-black">
                  <img
                    src={resolveWalledGardenImageUrl(
                      sl.imageUrl,
                      sl.caption || activePreviewAd.headline,
                      activePreviewAd.sponsorName
                    )}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = buildInlineFallbackSlideDataUri(
                        sl.caption || activePreviewAd.headline,
                        activePreviewAd.sponsorName
                      );
                    }}
                    alt={sl.caption || activePreviewAd.headline}
                    onClick={() => handleAdClickRedirect(activePreviewAd, idx)}
                    className="w-screen h-screen object-cover cursor-pointer"
                    title={`Click to open ${sl.redirectUrl || currentClickRedirectUrl}`}
                  />
                  {sl.caption && (
                    <div className="absolute bottom-20 inset-x-4 z-20 flex justify-center pointer-events-none">
                      <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold text-center max-w-md">
                        {sl.caption}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <video
              key={activePreviewAd.videoUrl}
              src={activePreviewAd.videoUrl}
              autoPlay
              playsInline
              muted={simMuted}
              onClick={() => handleAdClickRedirect(activePreviewAd, 0)}
              onEnded={() => setSimUnlocked(true)}
              className="w-screen h-screen object-cover cursor-pointer"
              title={`Click to open ${currentClickRedirectUrl}`}
            />
          )}

          {/* Top-Left Sponsor Pill & Direct Redirect Hint */}
          <div
            onClick={() => handleAdClickRedirect(activePreviewAd, simSlideIdx)}
            className="fixed top-4 left-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold cursor-pointer hover:bg-black/90 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activePreviewAd.sponsorName}</span>
            <span className="text-amber-300 underline flex items-center gap-1 ml-1">
              <span>Tap Ad to Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>

          {/* Top-Right Immediate X Close Button */}
          <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreenTestOpen(false)}
              className="w-11 h-11 rounded-full bg-black/85 hover:bg-rose-600 text-white border-2 border-white/50 shadow-2xl flex items-center justify-center cursor-pointer transition-all"
              title="Close Ad & Enjoy Connectivity"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Manual Swipe / Prev-Next Controls for Multi-Image Series */}
          {isPreviewCarousel && previewSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSimSlideIdx((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
                }}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSimSlideIdx((prev) => (prev + 1) % previewSlides.length);
                }}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15">
                {previewSlides.map((sl, idx) => (
                  <button
                    key={sl.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimSlideIdx(idx);
                    }}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === simSlideIdx ? 'w-7 bg-[#f05e17]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
                <span className="text-[11px] text-white font-bold ml-1">
                  {simSlideIdx + 1} / {previewSlides.length}
                </span>
              </div>
            </>
          )}

          {/* Bottom-Left Audio Toggle (for Video) */}
          {!isPreviewCarousel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSimMuted((prev) => !prev);
              }}
              className="fixed bottom-4 left-4 z-30 px-3.5 py-2 rounded-full bg-black/75 border border-white/25 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
            >
              {simMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{simMuted ? 'Unmute Audio' : 'Audio On'}</span>
            </button>
          )}
        </div>
      )}

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
                  Full-Screen Video &amp; Picture Series Ad Manager
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  100% Full-Screen + Click Redirect + {hoursVal}h / {gbVal}GB Auto-Trigger
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Display full-screen video ads or swipeable multi-image picture posts with direct click-through URLs immediately after authentication and every {hoursVal} hours or {gbVal} GB used.
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
              <span>{config.enabled ? 'Full-Screen Ads Active' : 'Ads Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (mediaType === 'image_carousel' && slides.some((s) => s.imageUrl.trim())) {
                  commitSlidesToLibraryAndPersist(
                    slides,
                    'Saved all slide pictures & pushed live to routers and guest phones!'
                  );
                } else {
                  persistConfig(config);
                }
              }}
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
          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-emerald-500/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Trigger 1 · Immediate</div>
              <div className="text-white font-bold text-xs mt-0.5">Full-Screen Post-Auth Ad</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Fills 100% of the screen immediately after OTT Voucher, EcoCash, or Free Wi-Fi connect. Clicking redirects to your chosen URL.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-amber-500/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Trigger 2 · Session Time</div>
                <div className="text-white font-bold text-xs mt-0.5">Play Again Every {hoursVal} Hours</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  MikroTik <code className="text-amber-300">advertise-interval</code> intercepts active sessions every {hoursVal}h to show the full-screen ad.
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

          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-cyan-500/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Trigger 3 · Data Usage</div>
                <div className="text-white font-bold text-xs mt-0.5">Play Again Every {gbVal} GB Used</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Monitors active session byte counters (<code className="text-cyan-300">bytes-in + bytes-out</code>) and triggers the ad at {gbVal} GB.
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
      {/* MAIN 12-COL GRID: LEFT (CREATE & LIBRARY) | RIGHT (FULL-SCREEN SIM) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLUMNS: UPLOAD NEW AD (VIDEO OR PICTURE SERIES) + LIBRARY */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveCampaignItem}
            className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232d42] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#f05e17]" />
                <h3 className="text-sm font-extrabold text-white">
                  {editingId ? 'Edit Full-Screen Ad Campaign' : 'Create Full-Screen Ad Campaign'}
                </h3>
              </div>

              {/* Ad Format Selector: Video vs Picture Series */}
              <div className="flex items-center gap-1.5 bg-[#090d16] p-1 rounded-xl border border-[#232d42]">
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    mediaType === 'video'
                      ? 'bg-[#f05e17] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Full-Screen Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('image_carousel')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    mediaType === 'image_carousel'
                      ? 'bg-[#f05e17] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Picture Series (Multi-Image)</span>
                </button>
              </div>
            </div>

            {editingId && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                <span>Editing existing campaign: <strong>{title}</strong></span>
                <button
                  type="button"
                  onClick={resetCampaignForm}
                  className="underline font-bold cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            {/* MODE A: FULL-SCREEN VIDEO UPLOAD */}
            {mediaType === 'video' ? (
              <div className="p-4 rounded-xl bg-[#141b2d] border border-dashed border-slate-600 hover:border-[#f05e17] transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-white font-bold block">
                      Upload Short Video File (.MP4 / .WebM) to VPS
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Plays edge-to-edge full-screen (<code className="text-amber-300">100vw x 100vh</code>). Clicking anywhere on the video opens your target URL.
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

                {serverVideos.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                      Uploaded Videos in /public/videos/ (Click to Use):
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

                <div>
                  <label className="text-[11px] text-slate-300 font-bold block mb-1">
                    Video Source URL (Auto-filled on upload, or paste direct .mp4 / .webm link) *
                  </label>
                  <input
                    type="text"
                    required={mediaType === 'video'}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="/videos/my_sponsor_ad.mp4 or https://.../spot.mp4"
                    className="w-full px-3 py-2 bg-[#0b0f1a] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>
            ) : (
              /* MODE B: MULTI-IMAGE PICTURE SERIES BUILDER */
              <div className="p-4 rounded-xl bg-[#141b2d] border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">
                      Full-Screen Picture Series (Manual Swipe / Tap Next)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Add one or more pictures. Each picture fills the entire screen and redirects to its own URL when clicked.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addSlide}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Picture Slide</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="p-3 rounded-xl bg-[#0b0f1a] border border-[#232d42] flex flex-col sm:flex-row gap-3 items-start"
                    >
                      <div className="w-20 h-20 rounded-lg bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {slide.imageUrl ? (
                          <img
                            src={resolveWalledGardenImageUrl(slide.imageUrl, slide.caption || `Slide ${idx + 1}`, sponsorName)}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = buildInlineFallbackSlideDataUri(
                                slide.caption || `Slide ${idx + 1}`,
                                sponsorName || 'T-Connect Sponsor'
                              );
                            }}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-600" />
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={slide.imageUrl}
                            onChange={(e) => updateSlide(slide.id, { imageUrl: e.target.value })}
                            placeholder="Picture URL (/images/... or https://...)"
                            className="flex-1 px-2.5 py-1.5 bg-[#141b2d] border border-[#232d42] rounded-lg text-white text-[11px] focus:outline-none focus:border-[#f05e17]"
                          />
                          <input
                            ref={(el) => {
                              slideImageInputRefs.current[slide.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSlideImageUpload(slide.id, e.target.files?.[0])}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => slideImageInputRefs.current[slide.id]?.click()}
                            className="px-2.5 py-1.5 rounded-lg bg-[#f05e17]/20 hover:bg-[#f05e17]/30 border border-[#f05e17]/40 text-orange-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload Photo</span>
                          </button>
                          {slides.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlide(slide.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                              title="Remove slide"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="url"
                            value={slide.redirectUrl}
                            onChange={(e) => updateSlide(slide.id, { redirectUrl: e.target.value })}
                            placeholder="Click Redirect URL (e.g. https://alliance.co.ls)"
                            className="w-full px-2.5 py-1.5 bg-[#141b2d] border border-emerald-500/30 rounded-lg text-emerald-200 text-[11px] focus:outline-none focus:border-emerald-400"
                          />
                          <input
                            type="text"
                            value={slide.caption || ''}
                            onChange={(e) => updateSlide(slide.id, { caption: e.target.value })}
                            placeholder="Optional slide caption"
                            className="w-full px-2.5 py-1.5 bg-[#141b2d] border border-[#232d42] rounded-lg text-slate-200 text-[11px] focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>

                        {serverPhotos.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              Uploaded Photos:
                            </span>
                            {serverPhotos.slice(0, 6).map((photo) => (
                              <button
                                key={photo.url}
                                type="button"
                                onClick={() => {
                                  const nextSlides = slides.map((s) =>
                                    s.id === slide.id ? { ...s, imageUrl: photo.url } : s
                                  );
                                  setSlides(nextSlides);
                                  commitSlidesToLibraryAndPersist(
                                    nextSlides,
                                    `Assigned "${photo.name}" to Slide #${idx + 1} & synced to routers!`
                                  );
                                }}
                                className={`px-2 py-0.5 rounded border text-[9px] font-mono cursor-pointer transition-colors ${
                                  slide.imageUrl === photo.url
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                    : 'bg-[#141b2d] border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                              >
                                {photo.name.slice(0, 22)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Campaign Metadata & Click Redirect URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Alliance Insurance Full-Screen Ad"
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
                <label className="text-slate-300 font-bold block mb-1">Ad Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Tap Screen to Claim Your Offer"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-xl text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-emerald-300 font-bold block mb-1">
                  Click-Through Redirect URL (When User Clicks Ad) *
                </label>
                <input
                  type="url"
                  required={mediaType === 'video'}
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://alliance.co.ls"
                  className="w-full px-3 py-2 bg-[#161d31] border border-emerald-500/40 rounded-xl text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
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
                  <option value="full_video">Require Full Watch</option>
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
                <span>
                  {editingId
                    ? 'Save Changes & Push to Routers'
                    : mediaType === 'image_carousel'
                    ? 'Save Picture Series to Active Library'
                    : 'Save Full-Screen Video to Active Library'}
                </span>
              </button>
            </div>
          </form>

          {/* 2. AD LIBRARY & SCOPE SELECTOR */}
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232d42] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Saved Full-Screen Ad Campaigns ({videoLibrary.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any campaign thumbnail to test it in the simulator or launch the 100% full-screen overlay.
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
                const isCarousel = item.mediaType === 'image_carousel' && Array.isArray(item.slides) && item.slides.length > 0;
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
                        title="Click to preview this campaign"
                      >
                        {isCarousel ? (
                          <img
                            src={item.slides![0].imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100"
                          />
                        ) : (
                          <video
                            src={item.videoUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          {isCarousel ? (
                            <span className="px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-amber-300">
                              {item.slides!.length} PICS
                            </span>
                          ) : (
                            <Play className="w-4 h-4 text-white fill-current" />
                          )}
                        </div>
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-xs truncate">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${scopeMeta.badgeClass}`}>
                            {scopeMeta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold">
                            {isCarousel ? `Picture Series (${item.slides!.length})` : 'Full-Screen Video'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          <span className="text-emerald-400 font-bold">{item.sponsorName}</span> • Redirect:{' '}
                          <span className="text-cyan-300 underline">{item.destinationUrl || 'https://tconnect.co.ls'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3">
                          <span>{item.watchMode === 'full_video' ? 'Full Watch' : `Skip after ${item.skipAfterSec}s`}</span>
                          <span>•</span>
                          <span>{(item.impressions || 0).toLocaleString()} views</span>
                          <span>•</span>
                          <span>{(item.clicks || 0).toLocaleString()} clicks</span>
                        </div>
                      </div>
                    </div>

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
                        {item.enabled ? 'ACTIVE' : 'PAUSED'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Edit Campaign"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                        title="Delete Campaign"
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

        {/* RIGHT 5 COLUMNS: FULL-SCREEN SIMULATOR & ROUTEROS SCRIPT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232d42] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#f05e17]" />
                <span className="font-extrabold text-white text-sm">Full-Screen Ad Display Simulator</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSimElapsedSec(0);
                    setSimUnlocked(false);
                    setSimSlideIdx(0);
                    if (simVideoRef.current) {
                      simVideoRef.current.currentTime = 0;
                      simVideoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#161d31] hover:bg-[#1f2942] text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimElapsedSec(0);
                    setSimUnlocked(false);
                    setIsFullScreenTestOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#f05e17] hover:bg-[#d94c0b] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>100% Full Screen</span>
                </button>
              </div>
            </div>

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

            {/* Edge-to-Edge Full-Screen Phone Viewport (100% Ad Media & Click Redirect) */}
            <div
              className="mx-auto w-full max-w-[330px] h-[510px] bg-black border-4 border-slate-700 rounded-[32px] overflow-hidden shadow-2xl relative font-sans select-none"
              onTouchStart={(e) => {
                simTouchStartXRef.current = e.touches[0]?.clientX || 0;
              }}
              onTouchEnd={(e) => {
                if (!isPreviewCarousel || previewSlides.length <= 1) return;
                const dx = (e.changedTouches[0]?.clientX || 0) - simTouchStartXRef.current;
                if (Math.abs(dx) > 35) {
                  if (dx < 0) {
                    setSimSlideIdx((prev) => (prev + 1) % previewSlides.length);
                  } else {
                    setSimSlideIdx((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
                  }
                }
              }}
            >
              {/* Full-Screen Media Canvas */}
              {isPreviewCarousel ? (
                <div
                  className="flex w-full h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${simSlideIdx * 100}%)` }}
                >
                  {previewSlides.map((sl, idx) => (
                    <div key={sl.id || idx} className="w-full h-full shrink-0 relative bg-black">
                      <img
                        src={resolveWalledGardenImageUrl(
                          sl.imageUrl,
                          sl.caption || activePreviewAd.headline,
                          activePreviewAd.sponsorName
                        )}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = buildInlineFallbackSlideDataUri(
                            sl.caption || activePreviewAd.headline,
                            activePreviewAd.sponsorName
                          );
                        }}
                        alt={sl.caption || activePreviewAd.headline}
                        onClick={() => handleAdClickRedirect(activePreviewAd, idx)}
                        className="w-full h-full object-cover cursor-pointer"
                        title={`Click ad to visit ${sl.redirectUrl || currentClickRedirectUrl}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <video
                  ref={simVideoRef}
                  key={activePreviewAd.videoUrl}
                  src={activePreviewAd.videoUrl}
                  playsInline
                  autoPlay
                  muted={simMuted}
                  onClick={() => handleAdClickRedirect(activePreviewAd, 0)}
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (dur && !isNaN(dur) && isFinite(dur)) {
                      setSimVideoDurationSec(Math.ceil(dur));
                    }
                  }}
                  onEnded={() => setSimUnlocked(true)}
                  onError={() => setSimUnlocked(true)}
                  className="w-full h-full object-cover cursor-pointer bg-black"
                  title={`Click ad to visit ${currentClickRedirectUrl}`}
                />
              )}

              {/* Floating Top Bar: Sponsor Redirect Pill + Immediate X Close Button */}
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleAdClickRedirect(activePreviewAd, simSlideIdx)}
                  className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer truncate max-w-[165px]"
                  title={`Click to open ${currentClickRedirectUrl}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{activePreviewAd.sponsorName}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullScreenTestOpen(true)}
                  title="Immediate X Close Button (Releases user straight to internet)"
                  className="w-8 h-8 rounded-full bg-black/85 hover:bg-rose-600 text-white border-2 border-white/50 shadow-lg flex items-center justify-center cursor-pointer transition-all shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Manual Swipe / Prev & Next Arrows for Picture Series */}
              {isPreviewCarousel && previewSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimSlideIdx((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimSlideIdx((prev) => (prev + 1) % previewSlides.length);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Bottom Floating Bar: Click Redirect Callout / Slide Indicators / Mute */}
              <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
                {!isPreviewCarousel ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimMuted((prev) => {
                        const next = !prev;
                        if (simVideoRef.current) simVideoRef.current.muted = next;
                        return next;
                      });
                    }}
                    className="px-2.5 py-1 rounded-full bg-black/75 border border-white/25 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    {simMuted ? <VolumeX className="w-3 h-3 text-amber-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                    <span>{simMuted ? 'Unmute' : 'Audio On'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/20">
                    {previewSlides.map((sl, idx) => (
                      <button
                        key={sl.id || idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimSlideIdx(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === simSlideIdx ? 'w-4 bg-[#f05e17]' : 'w-1.5 bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleAdClickRedirect(activePreviewAd, simSlideIdx)}
                  className="px-3 py-1 rounded-full bg-[#f05e17]/90 hover:bg-[#f05e17] text-white font-extrabold text-[10px] flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  <span>Tap Ad: Open Offer</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400">
              Clicking anywhere on the full-screen ad redirects to:{' '}
              <span className="text-emerald-400 font-bold underline">{currentClickRedirectUrl}</span>
            </div>
          </div>

          {/* MikroTik RouterOS Enforcement Script Card */}
          <div className="bg-[#0f1422] rounded-2xl border border-[#232d42] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-white">
                  MikroTik RouterOS v7 Full-Screen Ad Sync Commands
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
