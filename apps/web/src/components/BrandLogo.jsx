import React from 'react';

export function BrandLogo({ className = '', ...imageProps }) {
  return (
    <img
      {...imageProps}
      src="/logo.svg"
      alt="SaveRaks"
      className={['brand-logo', className].filter(Boolean).join(' ')}
    />
  );
}
