import { Capacitor } from '@capacitor/core';

export type CapacitorPlatform = 'ios' | 'android' | 'web';

export function getCapacitorPlatform(): CapacitorPlatform {
  if (!Capacitor.isNativePlatform()) return 'web';
  const p = Capacitor.getPlatform();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  return 'web';
}

export function readTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function surfaceHex(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#0f172a' : '#ffffff';
}

/** Sync status bar (and Android bar colors) to current theme. */
export async function syncSystemChrome(
  theme: 'light' | 'dark',
  platform: CapacitorPlatform = getCapacitorPlatform(),
): Promise<void> {
  if (platform === 'web') return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const bg = surfaceHex(theme);

    if (platform === 'ios') {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: theme === 'dark' ? Style.Light : Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    } else {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: theme === 'dark' ? Style.Light : Style.Dark });
      await StatusBar.setBackgroundColor({ color: bg });
    }
  } catch {
    /* plugin unavailable in browser */
  }

  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#0d9488');
  }
}

export function applyNativeDocumentClasses(platform: CapacitorPlatform): void {
  if (typeof document === 'undefined' || platform === 'web') return;
  const root = document.documentElement;
  root.classList.add('capacitor-native');
  root.classList.remove('capacitor-ios', 'capacitor-android');
  if (platform === 'ios') root.classList.add('capacitor-ios');
  if (platform === 'android') root.classList.add('capacitor-android');
}

/** True when a modal/sheet marked with data-capacitor-overlay is open. */
export function hasOpenCapacitorOverlay(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('[data-capacitor-overlay="open"]');
}

