import React from 'react';

interface TConnectLogoProps {
  className?: string;
  withBackground?: boolean;
}

/**
 * Official T-Connect Brand Identity Logo Mark
 * Faithfully matches the official orange leaf-petal silhouette on dark background
 */
export const TConnectLogo: React.FC<TConnectLogoProps> = ({ 
  className = "w-6 h-6",
  withBackground = false
}) => {
  if (withBackground) {
    return (
      <div className="w-8 h-8 rounded-xl bg-black border border-[#1f283d] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 23 64.5 L 48 64.5 C 60.5 64 70.5 52.5 78.5 33.5 C 68.5 33.5 45.5 31.8 33.2 42.2 C 26.2 48.2 23.5 56.5 23 64.5 Z"
            fill="#FF5500"
          />
        </svg>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 23 64.5 L 48 64.5 C 60.5 64 70.5 52.5 78.5 33.5 C 68.5 33.5 45.5 31.8 33.2 42.2 C 26.2 48.2 23.5 56.5 23 64.5 Z"
        fill="#FF5500"
      />
    </svg>
  );
};
