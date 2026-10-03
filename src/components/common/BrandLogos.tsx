import React from 'react';
import { GatewayProvider } from '../../types';

export const OttVoucherLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#0066CC" />
    <path d="M25 45H95V75H25V45Z" rx="8" fill="#FFFFFF" fillOpacity="0.15" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="6 4"/>
    <circle cx="25" cy="60" r="10" fill="#0066CC"/>
    <circle cx="95" cy="60" r="10" fill="#0066CC"/>
    <path d="M42 52L48 68H54L60 52H55L51 63L47 52H42Z" fill="#FFA500"/>
    <circle cx="68" cy="60" r="4" fill="#FFFFFF"/>
    <circle cx="78" cy="60" r="4" fill="#FFFFFF"/>
  </svg>
);

export const EcoCashLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#003399" />
    <circle cx="60" cy="60" r="38" fill="#0080FF" fillOpacity="0.3"/>
    <path d="M45 42C45 42 68 38 74 52C80 66 56 68 76 78" stroke="#FFCC00" strokeWidth="8" strokeLinecap="round"/>
    <circle cx="46" cy="74" r="7" fill="#FFFFFF"/>
  </svg>
);

export const MyWalletLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#E60000" />
    <circle cx="60" cy="60" r="34" fill="#FFFFFF" />
    <path d="M48 60C48 53.3726 53.3726 48 60 48C66.6274 48 72 53.3726 72 60C72 66.6274 66.6274 72 60 72" fill="#E60000" />
    <circle cx="60" cy="60" r="6" fill="#FFFFFF" />
  </svg>
);

export const XpaymentsLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#0F172A" />
    <path d="M34 34L60 62L86 34" stroke="#10B981" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M86 86L60 58L34 86" stroke="#06B6D4" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="60" cy="60" r="5" fill="#FFFFFF"/>
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
