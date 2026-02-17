import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Pro Gas Management | ระบบจัดการแก๊สมืออาชีพ',
    description: 'ระบบจัดการแก๊สและถังอุปกรณ์แบบมืออาชีพ - Pro Gas & Asset Management System',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'ProGas',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#e67e22',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="th">
            <head>
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            </head>
            <body>
                {children}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
                    }}
                />
            </body>
        </html>
    );
}
