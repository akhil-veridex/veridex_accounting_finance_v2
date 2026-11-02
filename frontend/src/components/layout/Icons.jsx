import React from 'react';

export function MonogramLogo({ width = 28, height = 28, className = 'logo-vd-mark' }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vdMonogramGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="#22262E" />
      <path d="M7 10L13 22L17 14" stroke="url(#vdMonogramGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10H21C23.76 10 26 12.24 26 15C26 17.76 23.76 20 21 20H17V10Z" stroke="url(#vdMonogramGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ className = 'nav-chevron', width = 12, height = 12 }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 256 256" fill="none">
      <path d="M208 96l-80 80-80-80" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ width = 14, height = 14, className = '' }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 256 256" fill="none">
      <circle cx="112" cy="112" r="80" stroke="currentColor" strokeWidth="22" />
      <path d="M168.5 168.5L224 224" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon({ width = 16, height = 16, className = '' }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 256 256" fill="none">
      <path d="M128 24a64 64 0 00-64 64v44.8L44.8 160h166.4L192 132.8V88a64 64 0 00-64-64z" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" />
      <path d="M104 200a24 24 0 0048 0" stroke="currentColor" strokeWidth="20" />
    </svg>
  );
}

export function DensityIcon({ width = 14, height = 14, className = '' }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 256 256" fill="none">
      <path d="M40 80h176M40 128h176M40 176h176" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}

export function CollapseIcon({ width = 16, height = 16, className = '' }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 256 256" fill="none">
      <path d="M160 208l-80-80 80-80" stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
