'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

export default function IPGreeting() {
  const locale = useLocale();
  const [greeting, setGreeting] = useState(null);
  const [visible, setVisible] = useState(false);

  const texts = {
    bg: {
      first: '👋 Добре дошли в света на AI!',
      returning: (count) => `✨ Благодарим ви, че отново сте в света на AI! Това е вашето ${count}-то посещение.`,
    },
    en: {
      first: '👋 Welcome to the world of AI!',
      returning: (count) => `✨ Thank you for visiting the world of AI again! This is your visit number ${count}.`,
    }
  };

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        // Проверяваме дали вече сме броили това посещение в тази сесия
        const alreadyCounted = sessionStorage.getItem('visit_counted');
        
        if (alreadyCounted) {
          // Сесията е активна — само показваме greeting без да броим
          const savedCount = sessionStorage.getItem('visit_count');
          const savedStatus = sessionStorage.getItem('visit_status');
          
          if (savedStatus && savedCount) {
            const t = texts[locale] || texts['bg'];
            if (savedStatus === 'new') {
              setGreeting(t.first);
            } else {
              setGreeting(t.returning(savedCount));
            }
            setVisible(true);
            setTimeout(() => setVisible(false), 5000);
          }
          return; // Спираме тук — не правим API call
        }

        // Първо влизане в тази сесия → правим API call
        const res = await fetch('/api/check-ip', { method: 'GET' });
        const text = await res.text();
        const data = JSON.parse(text);

        const t = texts[locale] || texts['bg'];

        if (data.visit_count === 1 || data.status === 'new') {
          setGreeting(t.first);
          sessionStorage.setItem('visit_status', 'new');
        } else {
          setGreeting(t.returning(data.visit_count));
          sessionStorage.setItem('visit_status', 'returning');
        }

        // Записваме в sessionStorage за тази сесия
        sessionStorage.setItem('visit_counted', 'true');
        sessionStorage.setItem('visit_count', data.visit_count);

        setVisible(true);
        setTimeout(() => setVisible(false), 5000);

      } catch (err) {
        console.error('IPGreeting error:', err);
      }
    };

    fetchGreeting();
  }, [locale]);

  if (!greeting) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '-120px'})`,
      transition: 'transform 0.5s ease',
      background: 'rgba(20, 10, 30, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(165, 126, 166, 0.4)',
      borderRadius: '16px',
      padding: '1rem 2rem',
      color: '#a57ea6',
      fontSize: '1rem',
      fontWeight: '500',
      zIndex: 9999,
      textAlign: 'center',
      maxWidth: '90vw',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      {greeting}
    </div>
  );
}