# PWA Setup Instructions

To complete the PWA setup for iPhone home screen support, follow these steps:

1.  **Generate Icons**
    You need to generate PNG icons from the `static/icon.svg` file created.
    -   Create `static/pwa-192x192.png` (192x192 pixels)
    -   Create `static/pwa-512x512.png` (512x512 pixels)
    -   Create `static/apple-touch-icon.png` (180x180 pixels, used specifically for iOS)

    You can use online tools like [RealFaviconGenerator](https://realfavicongenerator.net/) or just convert the SVG using any image editor.

2.  **Verify Configuration**
    -   The `vite.config.ts` is configured to look for these icons in the manifest.
    -   The `index.html` file contains the app shell entrypoint.

3.  **Deploy / Test**
    -   Build the app: `npm run build`
    -   Preview it: `npm run preview`
    -   Open on your iPhone in Safari.
    -   Tap the "Share" button and select "Add to Home Screen".
