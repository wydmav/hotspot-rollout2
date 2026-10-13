// Browser Notification Service for T-Connect Control Tower
// Native Notification API with permission handling and sound chime synthesis

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

class BrowserNotificationService {
  private audioContext: AudioContext | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch {
      return 'denied';
    }
  }

  // Synthesize an unobtrusive, professional audible alert tone using Web Audio API
  public playAlertSound(type: 'offline' | 'online' | 'test' = 'offline') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      if (type === 'offline') {
        // Two-tone warning: high to low frequency
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35); // A3
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'online') {
        // Upward pleasant chime: low to high
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now); // E4
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.28); // E5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Test chime: short double beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio autoplay policy might defer until user gesture
    }
  }

  public notifyRouterOffline(router: { name: string; id: string; siteName?: string; secondsWithoutHeartbeat?: number }) {
    this.playAlertSound('offline');

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const title = `🚨 MikroTik OFFLINE: ${router.name}`;
      const body = `Site: ${router.siteName || 'Hotspot Node'} | Disconnected from Starlink/WAN uplink (${router.secondsWithoutHeartbeat || 30}s without heartbeat).`;
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `router-offline-${router.id}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (err) {
      console.warn('Browser notification error:', err);
      return false;
    }
  }

  public notifyRouterOnline(router: { name: string; id: string; siteName?: string }) {
    this.playAlertSound('online');

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const title = `✅ MikroTik RECOVERED: ${router.name}`;
      const body = `Site: ${router.siteName || 'Hotspot Node'} | Telemetry and WireGuard heartbeat restored online.`;
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `router-online-${router.id}`,
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (err) {
      console.warn('Browser notification error:', err);
      return false;
    }
  }

  public sendTestNotification(): boolean {
    this.playAlertSound('test');

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const n = new Notification('🔔 T-Connect Browser Alerts Active', {
        body: 'Real-time Starlink & MikroTik offline notifications are enabled and functioning.',
        icon: '/favicon.ico',
        tag: 'tconnect-test-alert'
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}

export const browserNotificationService = new BrowserNotificationService();
