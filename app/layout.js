// rebornartai-clean/app/layout.js
import './globals.css';
import { TopSongsBlocks } from '../components/TopSongsBlocks'; // 
export const metadata = {
  title: 'Reborn Art AI',
  description: 'AI генерирана музика, видео и анимация',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bg">
      <body>
        {children}
      </body>
    </html>
  );
}