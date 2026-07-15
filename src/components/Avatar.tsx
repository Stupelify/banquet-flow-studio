import React, { useMemo } from 'react';

interface AvatarProps {
    name?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    square?: boolean;
}

const colors = [
    'from-teal-600 to-teal-400',
    'from-sky-600 to-sky-400',
    'from-indigo-600 to-indigo-400',
    'from-violet-600 to-violet-400',
    'from-fuchsia-600 to-fuchsia-400',
    'from-rose-600 to-rose-400',
    'from-amber-500 to-amber-400',
    'from-emerald-600 to-emerald-400',
];

export default function Avatar({ name, size = 'md', className = '', square = false }: AvatarProps) {
    const { initials, colorClass } = useMemo(() => {
        const safeName = name || 'User';

        // Get Initials (up to 2 characters)
        const words = safeName.trim().split(' ').filter(Boolean);
        let init = '';
        if (words.length === 0) {
            init = 'U';
        } else if (words.length === 1) {
            init = words[0].charAt(0).toUpperCase();
        } else {
            init = (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
        }

        // Getting deterministic color based on name string
        let hash = 0;
        for (let i = 0; i < safeName.length; i++) {
            hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colors.length;

        return { initials: init, colorClass: colors[colorIndex] };
    }, [name]);

    let sizeClass = 'w-10 h-10 text-sm';
    if (size === 'sm') sizeClass = 'w-7 h-7 text-[11px]';
    if (size === 'lg') sizeClass = 'w-12 h-12 text-lg';
    if (size === 'xl') sizeClass = 'w-16 h-16 text-2xl';

    return (
        <div
            className={`flex shrink-0 items-center justify-center font-bold text-white shadow-sm bg-gradient-to-br ${colorClass} ${sizeClass} ${square ? 'rounded-xl' : 'rounded-full'} ${className}`}
            title={name || 'User'}
            aria-label={name || 'User'}
        >
            {initials}
        </div>
    );
}
