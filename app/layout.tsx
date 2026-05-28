import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elitez Technical SEO Doctor',
  description: 'Professional technical SEO auditing tool by Elitez. Crawl, analyse, and fix SEO issues.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🩺</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  );
}
