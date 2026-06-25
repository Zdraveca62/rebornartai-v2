'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_SECONDS = 30;

export default function ClientsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [countdown, setCountdown] = useState(null);
  const [ipData, setIpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailLocked, setEmailLocked] = useState(false);
  const timerRef = useRef(null);
  const countRef = useRef(REDIRECT_SECONDS);

  useEffect(() => {
    checkIP();
    return () => clearInterval(timerRef.current);
  }, []);

  async function checkIP() {
    setLoading(true);
    try {
      const res = await fetch('/api/check-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_email' }),
      });
      const data = await res.json();
      setIpData(data);
      if (data.has_email) {
        setEmail(data.email);
        setEmailLocked(true);
        if (data.failed_attempts >= 3 && data.is_public_ip) {
          showMessage('⚠️ Публичен IP — твърде много неуспешни опити.', 'error');
        } else {
          showMessage('✉️ Разпознахме Вашия имейл. Моля, въведете паролата си.', 'info');
        }
      } else {
        showMessage('ℹ️ Моля, регистрирайте се, за да получите достъп.', 'info');
        setMode('signup');
      }
      startRedirectTimer();
    } catch (err) {
      showMessage('Грешка при проверка. Моля, опитайте отново.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function startRedirectTimer() {
    countRef.current = REDIRECT_SECONDS;
    setCountdown(REDIRECT_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        clearInterval(timerRef.current);
        router.push('/');
      }
    }, 1000);
  }

  function resetTimer() {
    clearInterval(timerRef.current);
    startRedirectTimer();
  }

  function showMessage(text, type = 'info') {
    setMessage(text);
    setMessageType(type);
  }

  const msgColors = { info: '#60a5fa', warn: '#fbbf24', error: '#f87171', success: '#34d399' };

  async function handleLogin(e) {
    e.preventDefault();
    resetTimer();
    if (ipData?.failed_attempts >= 3 && ipData?.is_public_ip) {
      showMessage('⛔ Достъпът е ограничен.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const failRes = await fetch('/api/check-ip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'failed_attempt' }),
        });
        const failData = await failRes.json();
        setIpData(prev => ({ ...prev, failed_attempts: failData.failed_attempts }));
        showMessage(`❌ ${data.error || 'Грешна парола'}. Опит ${failData.failed_attempts}/3.`, 'error');
        return;
      }
      await fetch('/api/check-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_attempts' }),
      });
      clearInterval(timerRef.current);
      setCountdown(null);
      showMessage('✅ Влязохте успешно! Пренасочване...', 'success');
      setTimeout(() => router.push('/ai-videos/Clients/dashboard'), 1500);
    } catch (err) {
      showMessage('❌ Грешка при вход. Опитайте отново.', 'error');
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    resetTimer();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showMessage(`❌ ${data.error || 'Грешка при регистрация'}`, 'error');
        return;
      }
      showMessage('✅ Регистрацията е успешна! Моля, влезте.', 'success');
      setMode('login');
    } catch (err) {
      showMessage('❌ Грешка при регистрация. Опитайте отново.', 'error');
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'url(images/backgrounds/ClientsBg.png) top/cover fixed', fontFamily: 'sans-serif', padding: '10rem 2rem 4rem' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#1a1a1a', borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a2a' }}>
        <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.5rem' }}>🎬 Клиентски портал</h1>
        {message && (
          <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${msgColors[messageType]}`, color: msgColors[messageType], borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            {message}
          </div>
        )}
        {countdown !== null && countdown > 0 && (
          <div style={{ textAlign: 'center', color: countdown <= 10 ? '#f87171' : '#9ca3af', fontSize: '0.82rem', marginBottom: '1rem' }}>
            ⏱ Пренасочване след <strong style={{ color: countdown <= 10 ? '#f87171' : '#e5e7eb' }}>{countdown}с</strong>
          </div>
        )}
        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
              {['login', 'signup'].map((m) => (
                <button key={m} onClick={() => { setMode(m); resetTimer(); }}
                  style={{ flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: mode === m ? '#3b82f6' : '#2a2a2a', color: mode === m ? '#fff' : '#9ca3af', fontWeight: mode === m ? 600 : 400 }}>
                  {m === 'login' ? 'Вход' : 'Регистрация'}
                </button>
              ))}
            </div>
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Имейл</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); resetTimer(); }} disabled={emailLocked} required placeholder="вашият@имейл.com"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid #333', background: emailLocked ? '#111' : '#222', color: emailLocked ? '#6b7280' : '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }} />
                {emailLocked && <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>🔒 Разпознат имейл от Вашия IP</span>}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Парола</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); resetTimer(); }} required placeholder="••••••••"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid #333', background: '#222', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={ipData?.failed_attempts >= 3 && ipData?.is_public_ip}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none', background: ipData?.failed_attempts >= 3 && ipData?.is_public_ip ? '#374151' : '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: ipData?.failed_attempts >= 3 && ipData?.is_public_ip ? 'not-allowed' : 'pointer' }}>
                {mode === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            </div>
          </>
        )}
        {loading && <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>⏳ Проверка...</div>}
      </div>
    </main>
  );
}
