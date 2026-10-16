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
 * Vodacom M-Pesa / MyWallet Lesotho Logo
 */
export const MyWalletLogo: React.FC<{ className?: string }> = ({ className = 'w-28 h-9' }) => (
  <svg viewBox="0 0 240 76" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="76" rx="10" fill="#E60000" stroke="#CC0000" strokeWidth="1" />
    <g transform="translate(12, 10)">
      <circle cx="28" cy="28" r="18" fill="#FFFFFF" />
      <path d="M28 19C23 19 19 23 19 28C19 33 23 37 28 37C33 37 37 33 37 28C37 23 33 19 28 19ZM28 34C24.7 34 22 31.3 22 28C22 24.7 24.7 22 28 22C31.3 22 34 24.7 34 28C34 31.3 31.3 34 28 34Z" fill="#E60000"/>
      <circle cx="28" cy="27" r="3.5" fill="#E60000"/>
      <text x="56" y="30" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF">MyWallet</text>
      <text x="56" y="44" fontFamily="sans-serif" fontWeight="700" fontSize="9.5" fill="#FFE5E5" letterSpacing="1">VODACOM M-PESA</text>
    </g>
  </svg>
);

/**
 * xPayments Lesotho FinTech Hub Logo
 */
export const XpaymentsLogo: React.FC<{ className?: string }> = ({ className = 'w-28 h-9' }) => (
  <svg viewBox="0 0 240 76" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="76" rx="10" fill="#0B132B" stroke="#1F293D" strokeWidth="1" />
    <g transform="translate(14, 10)">
      <path d="M12 18L26 32L40 18" stroke="#10B981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M40 38L26 24L12 38" stroke="#06B6D4" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="52" y="30" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF">xPayments</text>
      <text x="52" y="44" fontFamily="sans-serif" fontWeight="700" fontSize="9.5" fill="#10B981" letterSpacing="1">PAYLESOTHO HUB</text>
    </g>
  </svg>
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

export const ProviderLogo: React.FC<{ provider: GatewayProvider; className?: string; variant?: 'card' | 'transparent' }> = ({ 
  provider, 
  className,
  variant = 'card'
}) => {
  switch (provider) {
    case 'ecocash':
      return <EcoCashLogo className={className} variant={variant} />;
    case 'ottvoucher':
      return <OttVoucherLogo className={className} variant={variant} />;
    case 'mywallet':
      return <MyWalletLogo className={className} />;
    case 'xpayments':
      return <XpaymentsLogo className={className} />;
    default:
      return null;
  }
};
