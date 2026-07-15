import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('internal navigation', () => {
  it('keeps dashboard booking links on the SPA router', () => {
    const paymentsPage = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/dashboard/payments/page.tsx'),
      'utf8'
    );

    expect(paymentsPage).not.toMatch(/window\.location\.href\s*=\s*`\/dashboard\/bookings\//);
  });

  it('does not import Ionic into shared web components', () => {
    const checkedFiles = [
      'src/components/IonicProvider.tsx',
      'src/components/adaptive/AdaptiveCard.tsx',
      'src/components/adaptive/AdaptiveButton.tsx',
    ];

    for (const file of checkedFiles) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(source).not.toContain('@ionic/react');
    }
  });
});
