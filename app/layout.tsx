import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Petales · A quiet place to gather what matters',
  description:
    'When someone you love dies, Petales gives the family one quiet place to gather every memory, photo, and voice that arrives in those first days — and gives the funeral home the material to produce a meaningful service from the family\'s own words.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-cream text-ink antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
