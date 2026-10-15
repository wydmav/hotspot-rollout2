import React from 'react';
import { GatewayProvider } from '../../types';

export const OttVoucherLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 220 75" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dark card background so white text of OTT-logo-light is crisp and visible everywhere */}
    <rect width="220" height="75" rx="10" fill="#080E1E" stroke="#1E293B" strokeWidth="1.5" />
    <g transform="translate(12, 10)">
      {/* OTT Circular Green Emblem */}
      <circle cx="28" cy="27" r="24" fill="none" stroke="#35D458" strokeWidth="5.5" />
      {/* Stylized Monogram */}
      <path d="M 13 18 L 43 18" stroke="#35D458" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 26 21 L 21 38 L 19 44" stroke="#35D458" strokeWidth="5" strokeLinecap="round" />
      <path d="M 36 21 L 30 44" stroke="#35D458" strokeWidth="4.5" strokeLinecap="round" />

      {/* OTT Wordmark */}
      <text x="64" y="32" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontWeight="900" fontSize="26" fill="#FFFFFF" letterSpacing="0.5">
        OTT
      </text>
      {/* VOUCHER Subtitle */}
      <text x="65" y="47" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontWeight="800" fontSize="10.5" fill="#FFFFFF" letterSpacing="2.5">
        VOUCHER
      </text>
    </g>
  </svg>
);

export const EcoCashLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 220 75" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Crisp white card background as in unnamed.jpg */}
    <rect width="220" height="75" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
    <g transform="translate(14, 8)">
      {/* EcoCash Text: Blue 'Eco' + Red 'Cash' */}
      <text x="4" y="40" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontWeight="900" fontSize="38" letterSpacing="-0.8">
        <tspan fill="#1A2D87">Eco</tspan>
        <tspan fill="#E5232A">Cash</tspan>
      </text>
      {/* Spache - Fono Tagline */}
      <text x="82" y="56" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontWeight="800" fontSize="13" fill="#1A2D87" letterSpacing="0.2">
        Spache - Fono
      </text>
    </g>
  </svg>
);

export const MyWalletLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="80" rx="14" fill="#E60000" />
    {/* Vodacom / M-Pesa Icon */}
    <circle cx="46" cy="40" r="18" fill="#FFFFFF" />
    <path d="M46 29C40 29 35 34 35 40C35 46 40 51 46 51C52 51 57 46 57 40C57 34 52 29 46 29ZM46 48C42 48 38 44 38 40C38 36 42 32 46 32C50 32 54 36 54 40C54 44 50 48 46 48Z" fill="#E60000"/>
    <circle cx="46" cy="38" r="4" fill="#E60000"/>
    {/* MyWallet Text */}
    <text x="76" y="38" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF">MyWallet</text>
    <text x="76" y="54" fontFamily="sans-serif" fontWeight="700" fontSize="11" fill="#FFE5E5" letterSpacing="1">VODACOM M-PESA</text>
  </svg>
);

export const XpaymentsLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="80" rx="14" fill="#0B132B" />
    {/* Chevron Logo */}
    <path d="M30 26L48 44L66 26" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M66 54L48 36L30 54" stroke="#06B6D4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    {/* xPayments Text */}
    <text x="80" y="38" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF">xPayments</text>
    <text x="80" y="54" fontFamily="sans-serif" fontWeight="700" fontSize="11" fill="#10B981" letterSpacing="1">PAYLESOTHO HUB</text>
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

export const ProviderLogo: React.FC<{ provider: GatewayProvider; className?: string }> = ({ provider, className }) => {
  switch (provider) {
    case 'ecocash':
      return <EcoCashLogo className={className} />;
    case 'mywallet':
      return <MyWalletLogo className={className} />;
    case 'ottvoucher':
      return <OttVoucherLogo className={className} />;
    case 'xpayments':
      return <XpaymentsLogo className={className} />;
    default:
      return null;
  }
};
