import React from 'react';
import { GatewayProvider } from '../../types';

/**
 * Official OTT Voucher Logo matching uploaded 'OTT-logo-light-100h.png'
 * Features the signature vibrant emerald green (#2cdb52) circular emblem with 
 * stylized double-T monogram and crisp bold white 'OTT VOUCHER' typography.
 * Rendered on a subtle dark background card (#080e1e) to ensure the white text
 * of the 'light' logo variant is 100% legible on both dark and light surfaces.
 */
export const OttVoucherLogo: React.FC<{ className?: string; variant?: 'card' | 'transparent' }> = ({ 
  className = 'w-28 h-9',
  variant = 'card'
}) => (
  <svg viewBox="0 0 240 76" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {variant === 'card' && (
      <rect width="240" height="76" rx="10" fill="#090E1D" stroke="#1E293B" strokeWidth="1.2" />
    )}
    <g transform="translate(14, 11)">
      {/* OTT Vibrant Green Circular Emblem */}
      <circle cx="27" cy="27" r="23.5" fill="none" stroke="#2CDB52" strokeWidth="5" />
      {/* Inner Stylized T-T Monogram */}
      <path d="M 12 18.5 L 42 18.5" stroke="#2CDB52" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M 23 21 L 19 41" stroke="#2CDB52" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 32 21 L 28 41" stroke="#2CDB52" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="27" cy="27" r="2.5" fill="#2CDB52" />

      {/* 'OTT' Wordmark */}
      <text 
        x="64" 
        y="33" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
        fontWeight="900" 
        fontSize="28" 
        fill="#FFFFFF" 
        letterSpacing="0.5"
      >
        OTT
      </text>

      {/* 'VOUCHER' Subtitle with wide tracking */}
      <text 
        x="65" 
        y="48" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
        fontWeight="800" 
        fontSize="10.5" 
        fill="#FFFFFF" 
        letterSpacing="3"
      >
        VOUCHER
      </text>
    </g>
  </svg>
);

/**
 * Official EcoCash Lesotho Logo matching uploaded 'unnamed.jpg'
 * Features the signature pure white background card, Royal Blue (#032B82) 'Eco' 
 * and Telecom Red (#E21A22) 'Cash', with the authentic cursive 'Spache - Fono' 
 * Lesotho tagline underneath.
 */
export const EcoCashLogo: React.FC<{ className?: string; variant?: 'card' | 'transparent' }> = ({ 
  className = 'w-28 h-9',
  variant = 'card'
}) => (
  <svg viewBox="0 0 240 76" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {variant === 'card' && (
      <rect width="240" height="76" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
    )}
    <g transform="translate(14, 9)">
      {/* Eco (Royal Blue) + Cash (Telecom Red) */}
      <text 
        x="4" 
        y="39" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
        fontWeight="900" 
        fontSize="36" 
        letterSpacing="-0.8"
      >
        <tspan fill="#032B82">Eco</tspan>
        <tspan fill="#E21A22">Cash</tspan>
      </text>

      {/* 'Spache - Fono' Cursive Tagline */}
      <text 
        x="78" 
        y="53" 
        fontFamily="Georgia, 'Times New Roman', Cambria, serif, cursive" 
        fontStyle="italic"
        fontWeight="700" 
        fontSize="13" 
        fill="#032B82" 
        letterSpacing="0.2"
      >
        Spache - Fono
      </text>
    </g>
  </svg>
);

/**
 * Official-style M-Pesa Logo matching the green phone outline + red SIM wave/card emblem
 * from the T-Connect Hotspot reference design.
 */
export const MPesaLogo: React.FC<{ className?: string; variant?: 'card' | 'transparent' }> = ({
  className = 'w-8 h-7',
  variant = 'transparent'
}) => (
  <svg viewBox="0 0 64 56" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {variant === 'card' && (
      <rect width="64" height="56" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
    )}
    {/* Green Smartphone Body */}
    <rect x="18" y="6" width="24" height="44" rx="5" fill="#FFFFFF" stroke="#28B446" strokeWidth="3.5" />
    {/* Top Speaker & Bottom Home Dot */}
    <line x1="27" y1="11" x2="33" y2="11" stroke="#28B446" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="30" cy="44.5" r="1.8" fill="#28B446" />
    {/* Inner Green Screen Accent */}
    <rect x="21.5" y="15" width="17" height="25" rx="1.5" fill="#E8F8EC" />
    {/* Red M-Pesa Curved SIM / Wave Emblem */}
    <path
      d="M14 25 C22 19, 36 19, 48 26 L44 33 C34 27, 23 27, 14 31 Z"
      fill="#E60000"
    />
  </svg>
);

export const PAYLESOTHO_LOGO_SRC = '/assets/aistudio/images_e91c64e4.jpeg';

export const PayLesothoLogo: React.FC<{ className?: string; variant?: 'card' | 'transparent' }> = ({ 
  className = 'w-28 h-9',
  variant = 'card'
}) => (
  <div
    className={`inline-flex items-center justify-center overflow-hidden bg-white px-1.5 py-0.5 ${
      variant === 'card' ? 'rounded-lg border border-slate-200 shadow-xs' : 'rounded'
    } ${className}`}
  >
    <img
      src={PAYLESOTHO_LOGO_SRC}
      alt="PayLesotho"
      className="w-full h-full object-contain select-none"
      draggable={false}
    />
  </div>
);

export const MikroTikLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#1E293B"/>
    <path d="M30 40H44V80H30V40Z" fill="#F05E17"/>
    <path d="M52 52H66V80H52V52Z" fill="#F05E17"/>
    <path d="M74 40H88V80H74V40Z" fill="#F05E17"/>
    <path d="M44 40L60 52L76 40" stroke="#FFFFFF" strokeWidth="4"/>
  </svg>
);

export const ProviderLogo: React.FC<{ provider: GatewayProvider | 'mpesa'; className?: string; variant?: 'card' | 'transparent' }> = ({ 
  provider, 
  className,
  variant = 'card'
}) => {
  switch (provider) {
    case 'mpesa':
      return <MPesaLogo className={className} variant={variant} />;
    case 'ecocash':
      return <EcoCashLogo className={className} variant={variant} />;
    case 'ottvoucher':
      return <OttVoucherLogo className={className} variant={variant} />;
    case 'paylesotho':
    default:
      return <PayLesothoLogo className={className} variant={variant} />;
  }
};
