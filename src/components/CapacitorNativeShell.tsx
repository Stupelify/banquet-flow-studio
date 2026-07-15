
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  applyNativeDocumentClasses,
  getCapacitorPlatform,
  hasOpenCapacitorOverlay,
  readTheme,
  syncSystemChrome,
} from '@/lib/capacitor/nativeShell';

/**
 * Native-only runtime: document classes, system chrome, keyboard inset, Android back.
 */
export default function CapacitorNativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const platform = getCapacitorPlatform();
    applyNativeDocumentClasses(platform);
    void syncSystemChrome(readTheme(), platform);

    const themeObserver = new MutationObserver(() => {
      void syncSystemChrome(readTheme(), platform);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let removeKeyboard: (() => void) | undefined;
    void (async () => {
      try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
        const show = await Keyboard.addListener('keyboardWillShow', (info) => {
          document.documentElement.style.setProperty(
            '--keyboard-offset',
            `${info.keyboardHeight}px`,
          );
        });
        const hide = await Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.style.setProperty('--keyboard-offset', '0px');
        });
        removeKeyboard = () => {
          void show.remove();
          void hide.remove();
        };
      } catch {
        /* keyboard plugin unavailable */
      }
    })();

    let removeBack: (() => void) | undefined;
    if (platform === 'android') {
      void (async () => {
        try {
          const { App } = await import('@capacitor/app');
          const sub = await App.addListener('backButton', ({ canGoBack }) => {
            if (hasOpenCapacitorOverlay()) {
              const closeBtn = document.querySelector(
                '[data-capacitor-overlay="open"] [aria-label="Close form prompt"], [data-capacitor-overlay="open"] [aria-label="Close form prompt backdrop"]',
              ) as HTMLElement | null;
              closeBtn?.click();
              return;
            }
            const sidebarOpen = document.querySelector(
              '.mobile-sidebar[aria-hidden="false"]',
            );
            if (sidebarOpen) {
              document.querySelector<HTMLElement>('[aria-label="Close navigation"]')?.click();
              return;
            }
            if (canGoBack) {
              window.history.back();
            } else {
              void App.minimizeApp();
            }
          });
          removeBack = () => void sub.remove();
        } catch {
          /* app plugin unavailable */
        }
      })();
    }

    return () => {
      themeObserver.disconnect();
      removeKeyboard?.();
      removeBack?.();
      document.documentElement.style.removeProperty('--keyboard-offset');
      document.documentElement.classList.remove(
        'capacitor-native',
        'capacitor-ios',
        'capacitor-android',
      );
    };
  }, []);

  return null;
}
