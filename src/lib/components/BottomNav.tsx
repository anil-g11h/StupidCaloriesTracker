import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HouseIcon, ListPlusIcon, BarbellIcon, UserIcon } from '@phosphor-icons/react';
import './bottomnav.css'

// Define the order of your tabs
const TAB_ORDER = ['/', '/log', '/workouts', '/profile'];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const transitionNavigate = (newPath: string) => {
        // Fallback for browsers that don't support View Transitions
        if (!document.startViewTransition) {
            navigate(newPath);
            return;
        }

        if (location.pathname === newPath) {
        // Option: Scroll to top instead of navigating
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Optional: Trigger a "jiggle" animation on the button here
        return; 
    }
const currentIndex = TAB_ORDER.indexOf(location.pathname);
        const nextIndex = TAB_ORDER.indexOf(newPath);

        // Add a class to the <html> element to trigger specific CSS animations
        if (nextIndex > currentIndex) {
            document.documentElement.classList.add('transition-forward');
            document.documentElement.classList.remove('transition-backward');
        } else {
            document.documentElement.classList.add('transition-backward');
            document.documentElement.classList.remove('transition-forward');
        }

        document.startViewTransition(() => {
            navigate(newPath);
        });
    };

    // Helper to style active vs inactive icons
    const getBtnStyle = (path: string) =>
        `flex-1 flex items-center justify-center py-4 transition-colors ${location.pathname === path ? 'text-blue-600' : 'text-gray-600'
        } hover:bg-gray-50 active:bg-gray-100`;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-stretch"
            style={{ viewTransitionName: 'bottom-nav' }}>
            <button
                className={getBtnStyle('/')}
                onClick={() => transitionNavigate('/')}
                aria-label="Home"
            >
                <HouseIcon size={28} weight="duotone" />
            </button>

            <button
                className={getBtnStyle('/log')}
                onClick={() => transitionNavigate('/log')}
                aria-label="Log entry"
            >
                <ListPlusIcon size={28} weight="duotone" />
            </button>

            <button
                className={getBtnStyle('/workouts')}
                onClick={() => transitionNavigate('/workouts')}
                aria-label="Workouts"
            >
                <BarbellIcon size={28} weight="duotone" />
            </button>

            <button
                className={getBtnStyle('/profile')}
                onClick={() => transitionNavigate('/profile')}
                aria-label="Profile"
            >
                <UserIcon size={28} weight="duotone" />
            </button>
        </nav>
    );
}