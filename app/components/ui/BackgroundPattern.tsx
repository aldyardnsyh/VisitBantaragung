interface BackgroundPatternProps {
    variant?: "leaves" | "mountains" | "geometric" | "subtle";
    opacity?: number;
    className?: string;
}

export default function BackgroundPattern({
    variant = "subtle",
    opacity = 0.03,
    className = "",
}: BackgroundPatternProps) {
    const patterns = {
        leaves: (
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="leaves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path
                            d="M20 30c0-5 3-8 7-8 3 0 5 2 5 5 0 4-3 8-7 8-3 0-5-2-5-5zm15 5c2-3 5-4 8-3 3 1 4 4 3 7-1 3-4 5-7 4-3-1-5-4-4-8z"
                            fill="currentColor"
                            opacity={opacity}
                        />
                        <path
                            d="M60 70c0-5 3-8 7-8 3 0 5 2 5 5 0 4-3 8-7 8-3 0-5-2-5-5zm15 5c2-3 5-4 8-3 3 1 4 4 3 7-1 3-4 5-7 4-3-1-5-4-4-8z"
                            fill="currentColor"
                            opacity={opacity}
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#leaves)" />
            </svg>
        ),
        mountains: (
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="mountains" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
                        <path
                            d="M0 100 L50 40 L100 70 L150 30 L200 60 L200 100 Z"
                            fill="currentColor"
                            opacity={opacity}
                        />
                        <path
                            d="M0 100 L30 60 L80 80 L130 50 L180 75 L200 100 Z"
                            fill="currentColor"
                            opacity={opacity * 0.7}
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#mountains)" />
            </svg>
        ),
        geometric: (
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="geometric" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="2" fill="currentColor" opacity={opacity} />
                        <circle cx="60" cy="20" r="2" fill="currentColor" opacity={opacity} />
                        <circle cx="20" cy="60" r="2" fill="currentColor" opacity={opacity} />
                        <circle cx="60" cy="60" r="2" fill="currentColor" opacity={opacity} />
                        <path
                            d="M20 20 L60 20 L60 60 L20 60 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.5"
                            opacity={opacity * 0.5}
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#geometric)" />
            </svg>
        ),
        subtle: (
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="subtle" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                        <circle cx="30" cy="30" r="1.5" fill="currentColor" opacity={opacity} />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#subtle)" />
            </svg>
        ),
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
            {patterns[variant]}
        </div>
    );
}
