'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { useAccessLevel } from '@/hooks/useAccessLevel';
import WelcomeModal from '@/components/modals/WelcomeModal';


const REDIRECT_SECONDS = 30;

export default function ClientsPage() {
  const router = useRouter();
  const locale = useLocale();
  const { level, isLoading: levelLoading } = useAccessLevel();

  // ── Модал ─────────────────────────────────────────────────────────────────
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // ── Auth форма ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [countdown, setCountdown] = useState(null);
  const [ipData, setIpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailLocked, setEmailLocked] = useState(false);

  const timerRef = useRef(null);
  const countRef = useRef(REDIRECT_SECONDS);

  // ── Routing според ниво ───────────────────────────────────────────────────
  useEffect(() => {
    if (levelLoading) return;
    if (level >= 3) {
      router.replace(`/${locale}/client-zone`);
      return;
    }
    if (level === 2) {
      router.replace(`/${locale}/order-preview`);
      return;
    }
  }, [level, levelLoading]);

  // ── Auth state change ─────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearInterval(timerRef.current);
          
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── IP проверка (само след приемане на модала) ────────────────────────────
  useEffect(() => {
    if (showAuth) checkIP();
  }, [showAuth]);

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
          showMessage('⚠️ Публичен IP — твърде много неуспешни опити. Моля, свържете се с нас.', 'error');
        } else {
          showMessage('✉️ Разпознахме Вашия имейл. Моля, въведете паролата си.', 'info');
        }
      } else {
        if (data.is_public_ip) {
          showMessage('ℹ️ Моля, регистрирайте се, за да получите достъп.', 'info');
        } else {
          showMessage('ℹ️ Моля, регистрирайте се.', 'info');
        }
        setMode('signup');
      }
      startRedirectTimer();
    } catch (err) {
      console.error(err);
      showMessage('Грешка при проверка. Моля, опитайте отново.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Таймер ────────────────────────────────────────────────────────────────
  function startRedirectTimer() {
    countRef.current = REDIRECT_SECONDS;
    setCountdown(REDIRECT_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        clearInterval(timerRef.current);
        router.push(`/${locale}/`);
      }
    }, 1000);
  }

  function resetTimer() {
    clearInterval(timerRef.current);
    startRedirectTimer();
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Помощни ───────────────────────────────────────────────────────────────
  function showMessage(text, type = 'info') {
    setMessage(text);
    setMessageType(type);
  }

  const msgColors = {
    info: '#60a5fa',
    warn: '#fbbf24',
    error: '#f87171',
    success: '#34d399',
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    resetTimer();

    if (ipData?.failed_attempts >= 3 && ipData?.is_public_ip) {
      showMessage('⛔ Достъпът е ограничен. Публичен IP с твърде много неуспешни опити.', 'error');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const res = await fetch('/api/check-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'failed_attempt' }),
      });
      const d = await res.json();
      setIpData(prev => ({ ...prev, failed_attempts: d.failed_attempts }));
      if (d.blocked) {
        showMessage('⛔ Публичен IP — достъпът е ограничен след 3 неуспешни опита.', 'error');
      } else {
        showMessage(`❌ Грешна парола. Опит ${d.failed_attempts}/3.`, 'error');
      }
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
    router.push(`/${locale}/order-preview`);
  }
    
  // ── Signup ────────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault();
    resetTimer();

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showMessage(`❌ ${error.message}`, 'error');
      return;
    }

    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_email', email }),
    });

    showMessage('✅ Проверете имейла си за потвърждение.', 'success');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (levelLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#6b7280' }}>⏳ Зареждане...</span>
    </div>
  );

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url(/images/backgrounds/ClientsBg.png) top/cover fixed',
      fontFamily: 'sans-serif',
      padding: '10rem 2rem 4rem'
    }}>

      {/* ── СТЪПКА 1: Welcome Modal ── */}
      {showWelcome && (
        <WelcomeModal
          onAccept={() => {
            setShowWelcome(false);
            setShowAuth(true);
          }}
          onDecline={() => router.replace(`/${locale}/`)}
        />
      )}

      {/* ── СТЪПКА 2: Auth форма (след приемане на модала) ── */}
      {showAuth && (
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: '#1a1a1a',
          borderRadius: 16,
          padding: '2.5rem 2rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          border: '1px solid #2a2a2a',
        }}>
          <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
            🎬 Клиентски портал
          </h1>

          {message && (
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${msgColors[messageType]}`,
              color: msgColors[messageType],
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              lineHeight: 1.5,
            }}>
              {message}
            </div>
          )}

          {countdown !== null && countdown > 0 && (
            <div style={{
              textAlign: 'center',
              color: countdown <= 10 ? '#f87171' : '#9ca3af',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}>
              ⏱ Пренасочване към начало след{' '}
              <strong style={{ color: countdown <= 10 ? '#f87171' : '#e5e7eb' }}>
                {countdown}с
              </strong>
            </div>
          )}

          {!loading && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
                {['login', 'signup'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); resetTimer(); }}
                    style={{
                      flex: 1,
                      padding: '0.55rem',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: mode === m ? '#3b82f6' : '#2a2a2a',
                      color: mode === m ? '#fff' : '#9ca3af',
                      fontWeight: mode === m ? 600 : 400,
                      transition: 'all 0.2s',
                    }}
                  >
                    {m === 'login' ? 'Вход' : 'Регистрация'}
                  </button>
                ))}
              </div>

              <div>
                {/* Email */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#9ca3af', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>
                    Имейл
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); resetTimer(); }}
                    disabled={emailLocked}
                    required
                    placeholder="вашият@имейл.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: 8,
                      border: '1px solid #333',
                      background: emailLocked ? '#111' : '#222',
                      color: emailLocked ? '#6b7280' : '#fff',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {emailLocked && (
                    <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      🔒 Разпознат имейл от Вашия IP
                    </span>
                  )}
                </div>

                {/* Парола */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ color: '#9ca3af', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>
                    Парола
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); resetTimer(); }}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: 8,
                      border: '1px solid #333',
                      background: '#222',
                      color: '#fff',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={mode === 'login' ? handleLogin : handleSignup}
                  disabled={ipData?.failed_attempts >= 3 && ipData?.is_public_ip}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: 'none',
                    background: ipData?.failed_attempts >= 3 && ipData?.is_public_ip
                      ? '#374151' : '#3b82f6',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: ipData?.failed_attempts >= 3 && ipData?.is_public_ip
                      ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {mode === 'login' ? 'Вход' : 'Регистрация'}
                </button>
              </div>
            </>
          )}

          {loading && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
              ⏳ Проверка...
            </div>
          )}
        </div>
      )}
    </main>
  );
}
