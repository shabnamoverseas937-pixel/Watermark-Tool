# Watermark Tool

A batch photo watermarking web app — no accounts, no uploads. Everything
runs locally in the browser, so it works the same in Safari on iPhone and
Chrome on Android, and can be installed as a home-screen app (PWA).

## Features

- Batch process 5–20 photos at a time (JPG/PNG)
- Text watermark (custom text, font size, color, bold, shadow, rotation)
- Logo/image watermark (size, rotation, position)
- Combine text + logo
- 9-point position presets, opacity, edge margin, and output quality controls
- Live preview before exporting
- Download a single watermarked photo directly, or a ZIP for a full batch
- Settings are remembered between sessions (saved on-device)
- Installable as a PWA (works offline once loaded)

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Deploying

The app builds to static files in `dist/`, so it can be hosted on any
static host (Netlify, Vercel, GitHub Pages, S3, etc.). Once deployed over
HTTPS, employees can open the URL on their phone and use "Add to Home
Screen" (iPhone) or "Install app" (Android) to use it like a native app.

## Privacy

Photos are watermarked entirely on-device using the Canvas API. Nothing is
uploaded to a server.
