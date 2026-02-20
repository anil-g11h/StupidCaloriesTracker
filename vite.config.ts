import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/StupidCaloriesTracker/',
    plugins: [
        tailwindcss(),
        sveltekit(),
        SvelteKitPWA({
            registerType: 'autoUpdate',
            strategies: 'generateSW', // Use generateSW for static hosting
            srcDir: '.', // Project root
            filename: 'service-worker.js',
            devOptions: {
                enabled: true
            },
            manifest: {
                name: 'Stupid Calorie Tracker',
                short_name: 'Calories',
                description: 'A simple calorie and activity tracker',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                scope: '/StupidCaloriesTracker/',
                start_url: '/StupidCaloriesTracker/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
        })
    ],
    server: {
        host: '0.0.0.0' // This line is required to open the app on your phone
    }
});