/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isBikaNestedOverlayTarget } from '../nested-overlay';

describe('isBikaNestedOverlayTarget', () => {
  it('returns false for null/non-elements', () => {
    expect(isBikaNestedOverlayTarget(null)).toBe(false);
    expect(isBikaNestedOverlayTarget(document.createTextNode('x'))).toBe(false);
  });

  it('detects the nested overlay marker on self or ancestors', () => {
    const root = document.createElement('div');
    root.setAttribute('data-bika-nested-overlay', 'menu-item-note');
    const child = document.createElement('textarea');
    root.appendChild(child);
    document.body.appendChild(root);

    expect(isBikaNestedOverlayTarget(root)).toBe(true);
    expect(isBikaNestedOverlayTarget(child)).toBe(true);
    expect(isBikaNestedOverlayTarget(document.body)).toBe(false);

    root.remove();
  });
});
