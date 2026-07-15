
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export default function IonicProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform() || cancelled) return;

      setIsNative(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {isNative && (
        <style dangerouslySetInnerHTML={{ __html: `
          html.capacitor-native body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            min-height: 100% !important;
            height: auto !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: manipulation !important;
          }
          html.capacitor-native:has(.dashboard-root),
          html.capacitor-native:has(.dashboard-root) body {
            overflow: hidden !important;
            height: 100% !important;
          }
          html.capacitor-native:has(.dashboard-root) .dashboard-main {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior-y: contain;
          }
        `}} />
      )}
      {children}
    </>
  );
}
