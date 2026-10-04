import React from 'react';

export const LogoTextComponent = () => (
  <div className="flex items-center gap-2 font-semibold text-[18px]" aria-label="Kelola Konten">
    <img src="/logo.svg" alt="" width={30} height={30} className="object-contain" />
    <span>Kelola Konten</span>
  </div>
);
