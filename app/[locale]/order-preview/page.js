'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAccessLevel } from '@/hooks/useAccessLevel';
import SceneSelector from '@/components/preview/SceneSelector';
import PhotoUpload from '@/components/preview/PhotoUpload';
import PreviewOrderSummary from '@/components/preview/PreviewOrderSummary';

const STEPS = {
  SCENE: 'scene',
  PHOTOS: 'photos',
  SUMMARY: 'summary',
};

export default function OrderPreviewPage() {
  const router = useRouter();
  const locale = useLocale();
  const { level, isLoading, user } = useAccessLevel();

  const [step, setStep] = useState(STEPS.SCENE);
  const [selectedScene, setSelectedScene] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [existingOrder, setExistingOrder] = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(false);

  const handlePayment = async () => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType: 'preview',
        userId: user.id,
        userEmail: user.email,
        youtubeId: selectedScene?.youtube_id,
        itemType: selectedScene?.item_type || 'video',
        locale,
      })
    });
    const { sessionUrl } = await res.json();
    if (sessionUrl) window.location.href = sessionUrl;
  };

  useEffect(() => {
    if (isLoading) return;
    if (level < 2) router.replace(`/${locale}/ai-videos/Clients`);
  }, [isLoading, level]);

  useEffect(() => {
    if (isLoading || !user || level < 2) return;
    checkExistingOrder();
  }, [isLoading, user, level]);

  async function checkExistingOrder() {
    setCheckingOrder(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&type=preview&status=paid&limit=1`);
      const data = await res.json();
      if (data.orders && data.orders.length > 0) {
        setExistingOrder(data.orders[0]);
      }
    } catch {
      // Няма съществуваща поръчка — нормално
    } finally {
      setCheckingOrder(false);
    }
  }

  if (isLoading || checkingOrder) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
      <span style={{ color: '#6b7280' }}>⏳ Зареждане...</span>
    </main>
  );

  if (level < 2) return null;

  if (existingOrder) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'url(/images/backgrounds/ClientsBg.png) top/cover fixed', padding: '10rem 2rem 4rem', fontFamily: 'sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#1a1a1a', borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a2a', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
            {locale === 'bg' ? `Добре дошъл обратно!` : `Welcome back!`}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            {locale === 'bg' ? 'Вече имаш завършено видео превю. Готов ли си да направиш своята пълна поръчка?' : 'You already have a completed video preview. Ready to place your full order?'}
          </p>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ color: '#60a5fa', fontSize: '0.82rem', margin: 0 }}>📋 {locale === 'bg' ? 'Твоето превю' : 'Your preview'}</p>
            <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.25rem' }}>
              📅 {new Date(existingOrder.created_at).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-IE')}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => router.push(`/${locale}/full-order`)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              {locale === 'bg' ? '🚀 Към пълна поръчка' : '🚀 Place full order'}
            </button>
            <button onClick={() => router.push(`/${locale}/`)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px solid #2a2a2a', background: 'transparent', color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>
              {locale === 'bg' ? '← Начална страница' : '← Home'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'url(/images/backgrounds/ClientsBg.png) top/cover fixed', padding: '10rem 2rem 4rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '2.5rem' }}>
          {[
            { key: STEPS.SCENE, label: locale === 'bg' ? '1. Сюжет' : '1. Scene' },
            { key: STEPS.PHOTOS, label: locale === 'bg' ? '2. Снимки' : '2. Photos' },
            { key: STEPS.SUMMARY, label: locale === 'bg' ? '3. Плащане' : '3. Payment' },
          ].map((s, i, arr) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: step === s.key ? 700 : 400, background: step === s.key ? '#3b82f6' : Object.values(STEPS).indexOf(step) > i ? 'rgba(59,130,246,0.3)' : '#1a1a1a', color: step === s.key ? '#fff' : '#6b7280', border: '1px solid', borderColor: step === s.key ? '#3b82f6' : '#2a2a2a' }}>
                {Object.values(STEPS).indexOf(step) > i ? '✓ ' : ''}{s.label}
              </div>
              {i < arr.length - 1 && <div style={{ width: 24, height: 1, background: '#2a2a2a' }} />}
            </div>
          ))}
        </div>

        {step === STEPS.SCENE && (
          <SceneSelector selected={selectedScene} onSelect={(scene) => { setSelectedScene(scene); setStep(STEPS.PHOTOS); }} locale={locale} />
        )}
        {step === STEPS.PHOTOS && (
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} onBack={() => setStep(STEPS.SCENE)} onNext={() => setStep(STEPS.SUMMARY)} locale={locale} />
        )}
        {step === STEPS.SUMMARY && (
          <PreviewOrderSummary scene={selectedScene} photos={photos} user={user} onBack={() => setStep(STEPS.PHOTOS)} onSuccess={() => router.push(`/${locale}/`)} locale={locale} />
        )}
      </div>
    </main>
  );
}
