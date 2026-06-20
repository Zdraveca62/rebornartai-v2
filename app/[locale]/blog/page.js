'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';


export default function Blog() {
  return (
    <div>  
      <Link href="/">
        <button style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ← Назад
        </button>
      </Link>
      
    <div style={{ minHeight: '100vh', background: 'url(images/backgrounds/BlogsBg.png)', padding: '18rem'}}>
      
    </div>
    </div>
  );
}