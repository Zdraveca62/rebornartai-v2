'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PRICE = 2.80;
const VAT_RATE = 0.23;
const VAT_AMOUNT = parseFloat((PRICE * VAT_RATE / (1 + VAT_RATE)).toFixed(2));
const NET_AMOUNT = parseFloat((PRICE - VAT_AMOUNT).toFixed(2));

export default function PreviewOrderSummary({ scene, photos, user, onBack, onSuccess, locale }) {
  const isBg = locale === 'bg';
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Stripe Checkout ───────────────────────────────────────────────────────
  async function handlePayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'preview',
          scene_id: scene.id,
          scene_name: isBg ? scene.titleBg : scene.titleEn,
          photos: photos.map(p => ({ path: p.path, url: p.url })),
          user_id: user.id,
          email: user.email,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || (isBg ? 'Грешка при плащане' : 'Payment error'));
      }

      // Redirect към Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Заглавие */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {isBg ? 'Преглед на поръчката' : 'Order summary'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {isBg
            ? 'Провери детайлите преди плащане'
            : 'Review your details before payment'}
        </p>
      </div>

      {/* Карта — обобщение */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: 16,
        border: '1px solid #2a2a2a',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}>

        {/* Избран сюжет */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: '2rem' }}>{scene?.emoji}</span>
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: 2 }}>
              {isBg ? 'Избран сюжет' : 'Selected scene'}
            </p>
            <p style={{ color: '#fff', fontWeight: 600 }}>
              {isBg ? scene?.titleBg : scene?.titleEn}
            </p>
          </div>
        </div>

        {/* Снимки */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #2a2a2a',
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            {isBg ? `Снимки (${photos.length})` : `Photos (${photos.length})`}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {photos.map((photo, i) => (
              <div key={i} style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #2a2a2a',
                flexShrink: 0,
              }}>
                <img
                  src={photo.preview || photo.url}
                  alt={`Photo ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Имейл */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: '1.25rem' }}>✉️</span>
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: 2 }}>
              {isBg ? 'Резултатът ще бъде изпратен на' : 'Result will be sent to'}
            </p>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Видео детайли */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          gap: '1.5rem',
        }}>
          {[
            { label: isBg ? 'Дължина' : 'Duration', value: '10 sec' },
            { label: isBg ? 'Резолюция' : 'Resolution', value: '320×240px' },
            { label: isBg ? 'Доставка' : 'Delivery', value: isBg ? '2-3 часа' : '2-3 hours' },
          ].map((item, i) => (
            <div key={i}>
              <p style={{ color: '#4b5563', fontSize: '0.72rem', marginBottom: 2 }}>
                {item.label}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: 600 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Цена breakdown */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {isBg ? 'Нето цена' : 'Net price'}
            </span>
            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              €{NET_AMOUNT.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              VAT (23%)
            </span>
            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              €{VAT_AMOUNT.toFixed(2)}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid #2a2a2a',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              {isBg ? 'Общо' : 'Total'}
            </span>
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '1.25rem' }}>
              €{PRICE.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Предупреждение */}
      <div style={{
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.82rem',
        color: '#fbbf24',
        lineHeight: 1.6,
      }}>
        ⚠️ {isBg
          ? 'След успешно плащане ще получиш потвърждение на имейла си от Stripe и от нас. Резултатът пристига до 2-3 часа.'
          : 'After successful payment you\'ll receive confirmation from Stripe and from us. Result arrives within 2-3 hours.'}
      </div>

      {/* Грешка */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          color: '#f87171',
          fontSize: '0.85rem',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Бутони */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: 10,
            border: '1px solid #2a2a2a',
            background: 'transparent',
            color: '#9ca3af',
            fontSize: '0.9rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {isBg ? '← Назад' : '← Back'}
        </button>

        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            flex: 2,
            padding: '0.75rem',
            borderRadius: 10,
            border: 'none',
            background: loading ? '#1f2937' : '#3b82f6',
            color: loading ? '#4b5563' : '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>⏳ {isBg ? 'Зареждане...' : 'Loading...'}</>
          ) : (
            <>💳 {isBg ? 'Плати €2.80' : 'Pay €2.80'}</>
          )}
        </button>
      </div>

      {/* Сигурност */}
      <p style={{
        textAlign: 'center',
        color: '#374151',
        fontSize: '0.75rem',
        marginTop: '1rem',
      }}>
        🔒 {isBg
          ? 'Плащането е защитено от Stripe — данните ти са в безопасност'
          : 'Payment secured by Stripe — your data is safe'}
      </p>
    </div>
  );
}