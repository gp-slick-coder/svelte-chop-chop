import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import ImageEditor from './ImageEditor.svelte';
import { pluginFilters, pluginFinetune, pluginFrame, pluginWatermark, pluginResize } from '../plugins/index.js';
import type { ChopPlugin } from '../core/types.js';

const customPlugin: ChopPlugin = {
  name: 'custom',
  setup(ctx) {
    ctx.registerAction({
      id: 'custom-tab', label: 'Custom tool', group: 'tabs',
      execute: () => ctx.showPanel('custom'),
    });
  },
};

function loadedImage() {
  const image = new Image();
  Object.defineProperties(image, {
    complete: { value: true },
    naturalWidth: { value: 800 },
    naturalHeight: { value: 600 },
  });
  return image;
}

function buttonIcon(label: string, size = 20) {
  const icon = screen.getByRole('button', { name: label }).querySelector('svg');
  expect(icon).toBeTruthy();
  expect(icon?.getAttribute('aria-hidden')).toBe('true');
  expect(icon?.getAttribute('focusable')).toBe('false');
  expect(icon?.getAttribute('fill')).toBe('currentColor');
  expect(icon?.getAttribute('width')).toBe(String(size));
  expect(icon?.getAttribute('height')).toBe(String(size));
  expect(icon?.querySelector('path')?.getAttribute('d')).toBeTruthy();
  return icon!;
}

describe('ImageEditor bundled icons', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders accessible controls with decorative SVGs and no Google Fonts stylesheet', async () => {
    const { container } = render(ImageEditor, { props: { src: loadedImage() } });
    await screen.findByRole('button', { name: 'Crop' });

    buttonIcon('Undo', 18);
    buttonIcon('Redo', 18);
    buttonIcon('Rotate left 90°', 22);
    buttonIcon('Rotate right 90°', 22);
    buttonIcon('Crop');
    buttonIcon('Rectangle crop');
    buttonIcon('Circle crop');
    for (const selector of ['.chop-ar-icon', '.chop-ar-caret']) {
      expect(container.querySelector(selector)?.getAttribute('width')).toBe('18');
    }
    expect(screen.getByRole('combobox', { name: 'Aspect ratio' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export image' })).toBeTruthy();
    expect(container.querySelector('.material-symbols-rounded')).toBeNull();
    expect(document.head.querySelector('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]')).toBeNull();
  });

  it('keeps plugin icons, the custom-tab star fallback, and the finetune reset icon', async () => {
    render(ImageEditor, { props: {
      src: loadedImage(),
      plugins: [pluginFilters(), pluginFinetune(), pluginFrame(), pluginWatermark(), pluginResize(), customPlugin],
    } });
    await screen.findByRole('button', { name: 'Custom tool' });

    const paths = ['Crop', 'Filters', 'Finetune', 'Frame', 'Watermark', 'Resize'].map(
      (label) => buttonIcon(label).querySelector('path')!.getAttribute('d'),
    );
    expect(buttonIcon('Filters').getAttribute('viewBox')).toBe('0 0 24 24');
    expect(new Set(paths).size).toBe(6);
    expect(buttonIcon('Custom tool').querySelector('path')!.getAttribute('d')).toBe(paths[5]);

    await fireEvent.click(screen.getByRole('button', { name: 'Finetune' }));
    expect(screen.getByRole('button', { name: 'Finetune' }).getAttribute('aria-pressed')).toBe('true');
    buttonIcon('Reset', 16);
  });
});
