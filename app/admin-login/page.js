'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCheckedRef = useRef(false); // Предотвратява многократни проверки

  const ADMIN_TOKEN = 'reborn_admin_9f7d3e8a2c1b5f6e9d4a7c8b3e2f1a9d';

  useEffect(() => {
    // Предотвратява повторно изпълнение
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkExistingToken = async () => {
      const hasCookie = document.cookie.includes('admin_token=');
      if (hasCookie) {
        router.push('/admin');
        return;
      }
      
      const savedToken = sessionStorage.getItem('admin_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedToken })
          });
          const data = await res.json();
          if (data.valid) {
            document.cookie = `admin_token=${savedToken}; path=/; max-age=28800; SameSite=Lax`;
            router.push('/admin');
          }
        } catch (err) {
          console.error('Грешка при проверка:', err);
        }
      }
    };
    
    checkExistingToken();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!token.trim()) {
      setError('Моля, въведете администраторски токен');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        sessionStorage.setItem('admin_token', token.trim());
        document.cookie = `admin_token=${token.trim()}; path=/; max-age=28800; SameSite=Lax`;
        
        const from = searchParams.get('from');
        router.push(from || '/admin');
      } else {
        setError('Невалиден администраторски токен');
        setToken('');
      }
    } catch (err) {
      console.error('Грешка при вход:', err);
      setError('Грешка при свързване със сървъра');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      padding: '2rem',
      width: '100%',
      maxWidth: '400px',
      border: '1px solid rgba(139, 92, 246, 0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
        <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Администраторски вход</h1>
        <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Въведете валиден токен за достъп</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Въведете администраторски токен"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.5rem',
            marginBottom: '1rem',
            color: '#fca5a5',
            fontSize: '0.8rem',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: loading ? '#6b7280' : '#8b5cf6',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? 'Проверка...' : 'Вход'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link href="/" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: '0.8rem' }}>
          ← Назад към сайта
        </Link>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b, #000000, #4c1d95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <Suspense fallback={<div style={{ color: 'white' }}>Зареждане...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}