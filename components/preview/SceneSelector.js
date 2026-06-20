'use client';

const SCENES = [
  {
    id: 'singer',
    emoji: '🎤',
    bg: '#1e1b4b',
    accent: '#818cf8',
    titleBg: 'Звезда на сцената',
    titleEn: 'Star Performer',
    descBg: 'Ти на сцената — пееш своята песен пред публика. Прожектори, аплодисменти, слава.',
    descEn: 'You on stage — singing your song in front of a crowd. Spotlights, applause, glory.',
  },
  {
    id: 'skier',
    emoji: '⛷️',
    bg: '#0c1a2e',
    accent: '#38bdf8',
    titleBg: 'Бягство на пистата',
    titleEn: 'Slope Escape',
    descBg: 'Каращ ски на пълна скорост, преследван от мечка. Адреналин, сняг и невероятни трикове.',
    descEn: 'Skiing at full speed, chased by a bear. Adrenaline, snow and incredible tricks.',
  },
  {
    id: 'wedding',
    emoji: '💒',
    bg: '#1a0a2e',
    accent: '#e879f9',
    titleBg: 'Специалният ден',
    titleEn: 'The Special Day',
    descBg: 'Младоженец или младоженица — твоят най-важен момент оживява в кинематографичен стил.',
    descEn: 'Bride or groom — your most important moment brought to life in cinematic style.',
  },
];

export default function SceneSelector({ selected, onSelect, locale }) {
  const isBg = locale === 'bg';

  return (
    <div>
      {/* Заглавие */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {isBg ? 'Избери своя сюжет' : 'Choose your scene'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {isBg
            ? 'Твоята снимка ще бъде вплетена в избрания сюжет'
            : 'Your photo will be woven into the selected scene'}
        </p>
      </div>

      {/* Карти */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {SCENES.map((scene) => {
          const isSelected = selected?.id === scene.id;

          return (
            <button
              key={scene.id}
              onClick={() => onSelect(scene)}
              style={{
                width: '100%',
                background: scene.bg,
                border: `2px solid ${isSelected ? scene.accent : 'transparent'}`,
                borderRadius: 16,
                padding: '1.5rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s',
                boxShadow: isSelected
                  ? `0 0 24px ${scene.accent}44`
                  : '0 2px 12px rgba(0,0,0,0.4)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Избран badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: scene.accent,
                  color: '#000',
                  borderRadius: 20,
                  padding: '0.2rem 0.7rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {isBg ? '✓ Избран' : '✓ Selected'}
                </div>
              )}

              {/* Съдържание */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

                {/* Емоджи */}
                <div style={{
                  fontSize: '2.8rem',
                  lineHeight: 1,
                  flexShrink: 0,
                  filter: isSelected ? 'none' : 'grayscale(30%)',
                  transition: 'filter 0.25s',
                }}>
                  {scene.emoji}
                </div>

                {/* Текст */}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: isSelected ? scene.accent : '#e5e7eb',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '0.4rem',
                    transition: 'color 0.25s',
                  }}>
                    {isBg ? scene.titleBg : scene.titleEn}
                  </h3>
                  <p style={{
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {isBg ? scene.descBg : scene.descEn}
                  </p>
                </div>
              </div>

              {/* Декоративна линия отдолу */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: isSelected
                  ? scene.accent
                  : 'transparent',
                transition: 'background 0.25s',
                borderRadius: '0 0 14px 14px',
              }} />
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p style={{
        textAlign: 'center',
        color: '#4b5563',
        fontSize: '0.78rem',
        marginTop: '1.5rem',
      }}>
        {isBg
          ? '👆 Кликни върху сюжет за да го избереш — след избора автоматично преминаваш към следващата стъпка'
          : '👆 Click on a scene to select it — you\'ll automatically move to the next step'}
      </p>
    </div>
  );
}