
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    base: '/StupidCaloriesTracker/',
    plugins: [
        svelte(),
        tailwindcss()
    ],
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib')
        }
    },
    server: {
        host: '0.0.0.0' // This line is required to open the app on your phone
    }
});