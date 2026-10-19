import localFont from 'next/font/local';

// Plus Jakarta Sans (SIL Open Font License), self hosted so the build does not
// need to reach fonts.googleapis.com. Variable font covering weights 500-700.
export const jakartaSans = localFont({
  src: [
    { path: './plus-jakarta-sans-normal.woff2', weight: '500 700', style: 'normal' },
    { path: './plus-jakarta-sans-italic.woff2', weight: '500 700', style: 'italic' },
  ],
  display: 'swap',
});
