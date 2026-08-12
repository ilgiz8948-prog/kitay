import React from 'react';

interface AmperbikeLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AmperbikeLogo: React.FC<AmperbikeLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base' },
    md: { icon: 'w-10 h-10', text: 'text-xl' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Dynamic 3D SVG Amperbike Logo */}
      <div className={`relative flex-shrink-0 ${currentSize.icon}`}>
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(34,197,94,0.35)]"
        >
          <defs>
            {/* Green gradient for Letter A */}
            <linearGradient id="greenAGradient" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="85%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>

            {/* Inner green shadow */}
            <linearGradient id="innerGreenGrad" x1="60" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Yellow Lightning gradient */}
            <linearGradient id="lightningGrad" x1="110" y1="20" x2="150" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="80%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Metallic rim gradient */}
            <radialGradient id="rimGrad" cx="100" cy="100" r="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f4f4f5" />
              <stop offset="60%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#27272a" />
            </radialGradient>

            {/* Glow Filter */}
            <filter id="lightningGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#eab308" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* BACKGROUND SHAPE: Bold Green Letter "A" */}
          <path
            d="M 100 15 L 180 175 L 135 175 L 118 135 L 82 135 L 65 175 L 20 175 Z M 100 60 L 88 102 L 112 102 Z"
            fill="url(#greenAGradient)"
            stroke="#14532d"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Outer Green Bevel Edge */}
          <path
            d="M 100 15 L 180 175 L 160 175 L 100 38 L 40 175 L 20 175 Z"
            fill="#86efac"
            opacity="0.35"
          />

          {/* CENTER TIRE / WHEEL */}
          <g transform="translate(100, 110)">
            {/* Outer Rubber Tire */}
            <circle r="36" fill="#09090b" stroke="#27272a" strokeWidth="2" />
            <circle r="33" fill="none" stroke="#3f3f46" strokeWidth="3" strokeDasharray="4 3" />
            
            {/* Alloy Rim Outer */}
            <circle r="26" fill="none" stroke="url(#rimGrad)" strokeWidth="3" />
            <circle r="23" fill="#18181b" />

            {/* Spokes */}
            <path d="M -22 0 L 22 0 M 0 -22 L 0 22 M -15 -15 L 15 15 M -15 15 L 15 -15" stroke="#a1a1aa" strokeWidth="1.5" opacity="0.75" />
            
            {/* Center Hub */}
            <circle r="8" fill="url(#rimGrad)" stroke="#09090b" strokeWidth="1" />
            <circle r="3" fill="#ffffff" />
          </g>

          {/* OVERLAY ELECTRIC LIGHTNING BOLT */}
          <path
            d="M 130 15 L 90 95 L 118 95 L 70 185 L 150 82 L 118 82 Z"
            fill="url(#lightningGrad)"
            stroke="#78350f"
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#lightningGlow)"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-black tracking-tight italic text-emerald-400 ${currentSize.text} drop-shadow-[0_2px_8px_rgba(34,197,94,0.3)]`}>
            Amperbike<span className="text-yellow-400 font-extrabold not-italic">.kg</span>
          </span>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">
            SINO MARKETPLACE
          </span>
        </div>
      )}
    </div>
  );
};

export default AmperbikeLogo;
