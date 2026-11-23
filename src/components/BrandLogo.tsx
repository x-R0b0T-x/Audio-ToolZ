import React from 'react';
interface BrandLogoProps { size?: number; showWordmark?: boolean; wordmarkClassName?: string; }
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, showWordmark = true, wordmarkClassName = 'text-base' }) => (
  <span className="inline-flex items-center gap-2 shrink-0 select-none">
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 atz-brand-logo">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#191320" />
      <circle cx="32" cy="32" r="24" stroke="rgba(200,130,255,.35)" strokeWidth="1.4" />
      <circle cx="32" cy="8" r="2.6" fill="#ffffff" />
      <circle cx="32" cy="56" r="2.6" fill="#ffffff" />
      <circle cx="32" cy="32" r="18.2" stroke="#b34dff" strokeWidth="4.3" />
      <path d="M18 32H24.5L28.5 20.5L34 43.5L38 27.5L41 32H46" stroke="#39ff14" strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {showWordmark && <span className={`font-display font-bold tracking-tight whitespace-nowrap ${wordmarkClassName}`}>
      <span data-atz-brand="audio" style={{ color: '#f8f8f2' }}>Audio </span><span data-atz-brand="tool" style={{ color: '#39ff14' }}>Tool</span><span data-atz-brand="z" style={{ color: '#b34dff' }}>Z</span>
    </span>}
  </span>
);
