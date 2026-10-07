import React from 'react';
import { GatewayProvider } from '../../types';

export const OttVoucherLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="80" rx="14" fill="#00438F" />
    {/* OTT Voucher Ticket Notch Graphic */}
    <path d="M12 28C18 28 22 34 22 40C22 46 18 52 12 52V28Z" fill="#0b0f19" />
    <path d="M188 28C182 28 178 34 178 40C178 46 182 52 188 52V28Z" fill="#0b0f19" />
    {/* OTT Brand Mark */}
    <rect x="36" y="22" width="36" height="36" rx="8" fill="#F8B100" />
    <text x="54" y="47" fontFamily="sans-serif" fontWeight="900" fontSize="22" fill="#00438F" textAnchor="middle">O</text>
    {/* Wordmark */}
    <text x="86" y="40" fontFamily="sans-serif" fontWeight="900" fontSize="20" fill="#FFFFFF" letterSpacing="1">OTT</text>
    <text x="86" y="55" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#F8B100" letterSpacing="2">VOUCHER</text>
  </svg>
);

export const EcoCashLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="80" rx="14" fill="#002D72" />
    {/* Econet Telecom Blue Accent Arc */}
    <circle cx="48" cy="40" r="22" fill="#0066CC" fillOpacity="0.5"/>
    <circle cx="48" cy="40" r="16" fill="#F37023" />
    <path d="M42 40C42 36.6863 44.6863 34 48 34C51.3137 34 54 36.6863 54 40H42Z" fill="#FFFFFF"/>
    <circle cx="48" cy="45" r="3" fill="#FFFFFF"/>
    {/* EcoCash Text */}
    <text x="82" y="38" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF">EcoCash</text>
    <text x="82" y="54" fontFamily="sans-serif" fontWeight="700" fontSize="11" fill="#F37023" letterSpacing="1">ECONET LESOTHO</text>
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
