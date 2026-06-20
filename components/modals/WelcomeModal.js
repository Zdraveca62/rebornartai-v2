'use client'

import { useTranslations, useLocale } from 'next-intl'

export default function WelcomeModal({ onAccept, onDecline }) {
  const t = useTranslations('clients.welcome')
  const locale = useLocale()

  return (
    // Overlay — покрива всичко, не се затваря при клик извън
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.85)' }}>

      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
           style={{ background: 'var(--card-bg, #1a1a2e)', border: '1px solid var(--accent, #7c3aed)' }}>

        {/* Хедър */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="text-4xl mb-3">🎬</div>
          <h2 className="text-2xl font-bold mb-2"
              style={{ color: 'var(--accent, #7c3aed)' }}>
            {locale === 'bg'
              ? 'Клиентска зона'
              : 'Client Zone'}
          </h2>
          <p className="text-sm opacity-60">
            {locale === 'bg'
              ? 'Тази страница е за създаване на персонализирано видео превю'
              : 'This page is for creating your personalized video preview'}
          </p>
        </div>

        {/* Съдържание */}
        <div className="px-8 py-4 space-y-4">

          {/* Какво получаваш */}
          <div className="rounded-xl p-4"
               style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider opacity-70">
              {locale === 'bg' ? 'Какво получаваш' : 'What you get'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>
                  {locale === 'bg'
                    ? '10-секундно персонализирано видео превю'
                    : '10-second personalized video preview'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>
                  {locale === 'bg'
                    ? 'Резолюция 320×240px с фирмен банер'
                    : '320×240px resolution with branded banner'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>
                  {locale === 'bg'
                    ? 'Доставка до 2-3 часа на имейла ти'
                    : 'Delivered to your email within 2-3 hours'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>
                  {locale === 'bg'
                    ? 'Платежно потвърждение на момента'
                    : 'Instant payment confirmation'}
                </span>
              </li>
            </ul>
          </div>

          {/* Цена */}
          <div className="text-center py-3">
            <span className="text-4xl font-bold"
                  style={{ color: 'var(--accent, #7c3aed)' }}>
              €2.80
            </span>
            <p className="text-xs opacity-50 mt-1">
              {locale === 'bg'
                ? 'еднократно плащане · без абонамент'
                : 'one-time payment · no subscription'}
            </p>
          </div>

          {/* Предупреждение */}
          <div className="rounded-xl p-3 text-xs text-center opacity-60"
               style={{ background: 'rgba(255,255,255,0.05)' }}>
            {locale === 'bg'
              ? '⚠️ Резултатът ще бъде изпратен на имейла, с който се регистрирате. Моля, проверете папка "Спам" ако не получите отговор.'
              : '⚠️ The result will be sent to your registered email. Please check your Spam folder if you don\'t receive it.'}
          </div>
        </div>

        {/* Бутони */}
        <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
          <button
            onClick={onAccept}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--accent, #7c3aed)' }}>
            {locale === 'bg'
              ? '🎬 Искам моето превю'
              : '🎬 I want my preview'}
          </button>

          <button
            onClick={onDecline}
            className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--accent, #7c3aed)', border: '1px solid rgba(124,58,237,0.3)' }}>
            {locale === 'bg'
              ? '← Назад към видеата и музиката'
              : '← Back to videos & music'}
          </button>
        </div>

      </div>
    </div>
  )
}