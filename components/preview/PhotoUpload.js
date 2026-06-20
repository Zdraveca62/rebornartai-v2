'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const MAX_PHOTOS = 3;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function PhotoUpload({ photos, onPhotosChange, onBack, onNext, locale }) {
  const isBg = locale === 'bg';
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // ── Валидация на файл ─────────────────────────────────────────────────────
  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return isBg
        ? `${file.name} — невалиден формат. Само JPG, PNG, WEBP.`
        : `${file.name} — invalid format. Only JPG, PNG, WEBP.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return isBg
        ? `${file.name} — файлът е прекалено голям. Максимум ${MAX_SIZE_MB}MB.`
        : `${file.name} — file too large. Maximum ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  // ── Качване в Supabase Storage ────────────────────────────────────────────
  async function uploadFiles(files) {
    const newErrors = [];
    const validFiles = [];

    // Проверка колко снимки остават
    const remaining = MAX_PHOTOS - photos.length;
    if (files.length > remaining) {
      newErrors.push(
        isBg
          ? `Можеш да качиш още ${remaining} снимк${remaining === 1 ? 'а' : 'и'}.`
          : `You can upload ${remaining} more photo${remaining === 1 ? '' : 's'}.`
      );
      files = files.slice(0, remaining);
    }

    // Валидация
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        newErrors.push(err);
      } else {
        validFiles.push(file);
      }
    }

    setErrors(newErrors);
    if (validFiles.length === 0) return;

    setUploading(true);
    const uploaded = [];

    try {
      for (const file of validFiles) {
        const ext = file.name.split('.').pop();
        const filename = `preview/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabase.storage
          .from('client-photos')
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          newErrors.push(
            isBg
              ? `Грешка при качване на ${file.name}`
              : `Error uploading ${file.name}`
          );
          continue;
        }

        // Вземи публичния URL
        const { data: { publicUrl } } = supabase.storage
          .from('client-photos')
          .getPublicUrl(filename);

        uploaded.push({
          path: filename,
          url: publicUrl,
          name: file.name,
          size: file.size,
          preview: URL.createObjectURL(file),
        });
      }

      if (uploaded.length > 0) {
        onPhotosChange([...photos, ...uploaded]);
      }
      setErrors(newErrors);

    } finally {
      setUploading(false);
    }
  }

  // ── Премахване на снимка ──────────────────────────────────────────────────
  async function removePhoto(index) {
    const photo = photos[index];

    // Изтрий от Supabase Storage
    if (photo.path) {
      await supabase.storage
        .from('client-photos')
        .remove([photo.path]);
    }

    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }

  function handleFileInput(e) {
    const files = Array.from(e.target.files);
    uploadFiles(files);
    e.target.value = ''; // reset input
  }

  const canUploadMore = photos.length < MAX_PHOTOS;
  const canProceed = photos.length >= 1;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Заглавие */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {isBg ? 'Качи своите снимки' : 'Upload your photos'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {isBg
            ? `До ${MAX_PHOTOS} снимки · JPG, PNG, WEBP · Макс. ${MAX_SIZE_MB}MB`
            : `Up to ${MAX_PHOTOS} photos · JPG, PNG, WEBP · Max ${MAX_SIZE_MB}MB`}
        </p>
      </div>

      {/* Drop Zone */}
      {canUploadMore && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : '#2a2a2a'}`,
            borderRadius: 16,
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver
              ? 'rgba(59,130,246,0.08)'
              : 'rgba(255,255,255,0.02)',
            transition: 'all 0.25s',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {uploading ? '⏳' : '📸'}
          </div>
          <p style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: '0.25rem' }}>
            {uploading
              ? (isBg ? 'Качване...' : 'Uploading...')
              : (isBg ? 'Кликни или провлачи снимки тук' : 'Click or drag photos here')}
          </p>
          <p style={{ color: '#4b5563', fontSize: '0.82rem' }}>
            {isBg
              ? `${photos.length}/${MAX_PHOTOS} снимки качени`
              : `${photos.length}/${MAX_PHOTOS} photos uploaded`}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Грешки */}
      {errors.length > 0 && (
        <div style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
        }}>
          {errors.map((err, i) => (
            <p key={i} style={{
              color: '#f87171',
              fontSize: '0.82rem',
              margin: i > 0 ? '0.25rem 0 0' : 0,
            }}>
              ⚠️ {err}
            </p>
          ))}
        </div>
      )}

      {/* Качени снимки */}
      {photos.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            color: '#9ca3af',
            fontSize: '0.82rem',
            marginBottom: '0.75rem',
          }}>
            {isBg ? 'Качени снимки:' : 'Uploaded photos:'}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {photos.map((photo, index) => (
              <div key={index} style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                aspectRatio: '1',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
              }}>
                {/* Снимка */}
                <img
                  src={photo.preview || photo.url}
                  alt={photo.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Overlay с номер и бутон за изтриване */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    style={{
                      background: 'rgba(239,68,68,0.85)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>

                  <span style={{
                    background: 'rgba(0,0,0,0.6)',
                    color: '#9ca3af',
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: 6,
                  }}>
                    {index + 1}/{MAX_PHOTOS}
                  </span>
                </div>
              </div>
            ))}

            {/* Placeholder слотове */}
            {Array.from({ length: MAX_PHOTOS - photos.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  border: '2px dashed #2a2a2a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#374151',
                  fontSize: '1.5rem',
                  transition: 'border-color 0.2s',
                }}
              >
                +
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Предупреждение за имейл */}
      <div style={{
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        marginBottom: '2rem',
        fontSize: '0.82rem',
        color: '#fbbf24',
        lineHeight: 1.5,
      }}>
        ⚠️ {isBg
          ? 'Резултатът ще бъде изпратен на имейла ти до 2-3 часа. Моля, провери папка "Спам" ако не получиш отговор.'
          : 'The result will be sent to your email within 2-3 hours. Please check your Spam folder if you don\'t receive it.'}
      </div>

      {/* Навигация */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: 10,
            border: '1px solid #2a2a2a',
            background: 'transparent',
            color: '#9ca3af',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          {isBg ? '← Назад' : '← Back'}
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed || uploading}
          style={{
            flex: 2,
            padding: '0.75rem',
            borderRadius: 10,
            border: 'none',
            background: canProceed && !uploading ? '#3b82f6' : '#1f2937',
            color: canProceed && !uploading ? '#fff' : '#4b5563',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: canProceed && !uploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {uploading
            ? (isBg ? '⏳ Качване...' : '⏳ Uploading...')
            : (isBg ? 'Към преглед →' : 'Review order →')}
        </button>
      </div>

      {!canProceed && (
        <p style={{
          textAlign: 'center',
          color: '#4b5563',
          fontSize: '0.78rem',
          marginTop: '0.75rem',
        }}>
          {isBg
            ? '👆 Качи поне една снимка за да продължиш'
            : '👆 Upload at least one photo to continue'}
        </p>
      )}
    </div>
  );
}