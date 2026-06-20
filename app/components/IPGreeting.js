// components/IPGreeting.jsx
'use client';

import { useEffect, useState } from 'react';

export default function IPGreeting() {
  const [greeting, setGreeting] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch('/api/check-ip')
      .then((r) => r.json())
      .then((data) => {
        if (data?.message) {
          setGreeting(data.message);
          // fade-in след малко закъснение
          setTimeout(() => setVisible(true), 200);
          // скрий след 8 секунди
          setTimeout(() => setVisible(false), 8000);
        }
      })
      .catch(console.error);
  }, []);

  if (!greeting) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        transition: 'opacity 0.8s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.82)',
          color: '#fff',
          padding: '0.85rem 1.6rem',
          borderRadius: '12px',
          fontSize: '0.95rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '90vw',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {greeting}
      </div>
    </div>
  );
}
