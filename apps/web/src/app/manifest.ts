// Web App Manifest (Next.js 14 file convention).
// Servito a /manifest.webmanifest. PRD §5.6 — installabile su iOS/Android per
// abilitare le notifiche push sui dispositivi mobili (vedi ADR 0003).

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KetoPath — Una keto italiana',
    short_name: 'KetoPath',
    description:
      'Chetogenica e digiuno intermittente personalizzati: piani settimanali, lista spesa, notifiche.',
    lang: 'it',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f0df',
    theme_color: '#221d18',
    categories: ['health', 'lifestyle', 'food'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
