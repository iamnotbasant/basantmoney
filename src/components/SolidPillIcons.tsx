import React from 'react';

// Solid silhouette SVG icons matching the reference pill aesthetic (solid fills, smooth curves)

export const IconDigital = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="2" y="3" width="20" height="13" rx="3.5" />
    <path d="M8 20h8v-2H8v2z" />
    <path d="M10 16h4v2h-4v-2z" />
    <path d="M5.5 6.5a6.5 6.5 0 0 1 6.5-2" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>
);

export const IconFinance = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 6V4.5A2.5 2.5 0 0 1 10.5 2h3A2.5 2.5 0 0 1 16 4.5V6h3.5A2.5 2.5 0 0 1 22 8.5v9a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 17.5v-9A2.5 2.5 0 0 1 4.5 6H8zm2-1.5V6h4V4.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1z" />
    <circle cx="12" cy="13.5" r="3.2" fill="white" opacity="0.9" />
    <path d="M12 11.5v4M10.8 12.3h2.4a.9.9 0 0 1 0 1.2h-2.4a.9.9 0 0 0 0 1.2h2.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" />
  </svg>
);

export const IconSimple = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.2 3.8C15.5 4.2 9 8 6 13c-1.5 2.5-1.8 5-1.2 7 .5.3 1.2.4 2 .4 3.5 0 6.5-2.2 8.5-5 2.5-3.5 4.5-8.2 4.9-11.6z" />
    <path d="M5 20.4c3.5-3 8-7 13-14" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
  </svg>
);

export const IconFast = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.5 2.5a1 1 0 0 0-1.7-.6l-8 10.5a1 1 0 0 0 .8 1.6h5.8l-2 7.5a1 1 0 0 0 1.7.7l8.5-11a1 1 0 0 0-.8-1.7h-5.5l1.2-7z" />
  </svg>
);

export const IconSecure = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.2a2 2 0 0 0-1 .3L4.8 5.4A2 2 0 0 0 3.6 7v6.2c0 5.4 3.7 9.8 8.4 10.8.3 0 .7 0 1-.1 4.7-1.1 8.4-5.5 8.4-10.8V7a2 2 0 0 0-1.2-1.7L13 2.5a2 2 0 0 0-1-.3z" />
    <path d="M8.8 12.2l2.3 2.3 4.8-4.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const IconFluid = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Upper wave */}
    <path d="M3.5 7.5c1.2-1 2.8-1 4 0 1.4 1.2 3.1 1.2 4.5 0 1.4-1.2 3.1-1.2 4.5 0 1.2 1 2.8 1 4 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    {/* Lower wave */}
    <path d="M3.5 12.5c1.2-1 2.8-1 4 0 1.4 1.2 3.1 1.2 4.5 0 1.4-1.2 3.1-1.2 4.5 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    {/* Water droplet */}
    <path d="M17.5 11c0 0-3 3.5-3 5.3a3 3 0 1 0 6 0c0-1.8-3-5.3-3-5.3z" />
  </svg>
);

export const IconPercent = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="7.5" cy="7.5" r="3.2" />
    <circle cx="16.5" cy="16.5" r="3.2" />
    <path d="M17.5 5.5l-11 13" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

export const IconFood = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 4a7 7 0 0 0-7 6.5h14A7 7 0 0 0 12 4z" />
    <rect x="4" y="12" width="16" height="2" rx="1" />
    <path d="M5 16h14a2 2 0 0 1 2 2 3 3 0 0 1-3 3H6a3 3 0 0 1-3-3 2 2 0 0 1 2-2z" />
  </svg>
);

export const IconShopping = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 7V5.5A4 4 0 0 1 12 1.5a4 4 0 0 1 4 4V7h3a2 2 0 0 1 2 2l-1.2 11.2A3 3 0 0 1 16.8 23H7.2a3 3 0 0 1-3-2.8L3 9a2 2 0 0 1 2-2h3zm2 0h4V5.5a2 2 0 0 0-4 0V7z" />
  </svg>
);

export const IconTransport = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5 11l1.5-5.5A2.5 2.5 0 0 1 8.9 4h6.2a2.5 2.5 0 0 1 2.4 1.5L19 11v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H8v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" />
    <circle cx="7.5" cy="13.5" r="1.5" fill="white" />
    <circle cx="16.5" cy="13.5" r="1.5" fill="white" />
  </svg>
);

export const IconHome = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10.8 2.6a2 2 0 0 1 2.4 0l7.5 5.8a2 2 0 0 1 .8 1.6V19a3 3 0 0 1-3 3h-3.5a1 1 0 0 1-1-1v-4a1.5 1.5 0 0 0-3 0v4a1 1 0 0 1-1 1H5.5A3 3 0 0 1 2.5 19V10a2 2 0 0 1 .8-1.6l7.5-5.8z" />
  </svg>
);

export const IconCoins = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <ellipse cx="12" cy="7" rx="8" ry="4" />
    <path d="M4 7v4c0 2.2 3.6 4 8 4s8-1.8 8-4V7" />
    <path d="M4 13v4c0 2.2 3.6 4 8 4s8-1.8 8-4v-4" />
  </svg>
);

export const IconWallet = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 6.5A3.5 3.5 0 0 1 6.5 3h12A2.5 2.5 0 0 1 21 5.5v1.2a1 1 0 0 1-.5.9L18 9H4a2 2 0 0 1-1-2.5z" />
    <rect x="2" y="8" width="20" height="13" rx="3.5" />
    <circle cx="16.5" cy="14.5" r="1.6" fill="white" />
  </svg>
);

// New status icons
export const IconLocked = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5l7.5 3.2a2 2 0 0 1 1.2 1.8v5.7c0 5.4-3.7 9.8-8.4 10.8-4.7-1-8.4-5.4-8.4-10.8V7.5a2 2 0 0 1 1.2-1.8L12 2.5z" />
    <path d="M8.8 12.2l2.3 2.3 4.8-4.8" />
  </svg>
);

export const IconEstimated = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3.5 3" />
  </svg>
);

export const IconManuallyEdited = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 3v4h-4" />
  </svg>
);
