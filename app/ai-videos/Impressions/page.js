'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopSongsBlocks from '@/app/components/TopSongsBlocks';


export default function Impressions() {
 
  const router = useRouter();
  return (


    <div>  
    <button
      onClick={() => router.push('/')}
      style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}
    >
      ← Назад
    </button>
      
    <div style={{ minHeight: '100vh', background: 'url(/images/backgrounds/ImpressionsBg.png)', padding: '18rem'}}>
      <TopSongsBlocks/>
    </div>
    </div>
  );
}