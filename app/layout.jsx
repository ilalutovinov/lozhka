import './globals.css';
import { AppProvider } from '@/lib/app';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Лёгкость — меню на неделю по твоему бюджету',
  description: 'Меню на неделю, список покупок и самый выгодный магазин рядом — по реальным ценам Бишкека.',
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><AppProvider><Nav />{children}</AppProvider></body>
    </html>
  );
}
