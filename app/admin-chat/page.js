'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminChat() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Зареждане на сесиите
  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/admin');
      const data = await res.json();
      setSessions(data.sessions || []);
      setLoading(false);
    } catch (err) {
      console.error('Грешка при зареждане на сесии:', err);
      setLoading(false);
    }
  };

  // Зареждане на съобщения за избрана сесия
 const loadMessages = async (sessionId) => {
  try {
    const res = await fetch(`/api/chat?sessionId=${sessionId}&admin=true`);
    const data = await res.json();
    setMessages(data.messages || []);
    
    // 🔴 КЛЮЧОВОТО: Обнови списъка със сесии, за да премахне червената точка
    await loadSessions();
  } catch (err) {
    console.error('Грешка при зареждане на съобщения:', err);
  }
};

  // Изпращане на съобщение
  const sendMessage = async () => {
    if (!input.trim() || !selectedSession) return;
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.session_id,
          sender: 'admin',
          message: input
        })
      });
      
      if (res.ok) {
        setInput('');
        await loadMessages(selectedSession.session_id);
        await loadSessions();
      }
    } catch (err) {
      console.error('Грешка при изпращане:', err);
    }
  };

  // Изтриване на конкретно съобщение
  const deleteMessage = async (messageId) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете това съобщение?')) return;
    
    try {
      const res = await fetch(`/api/chat?id=${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadMessages(selectedSession.session_id);
        await loadSessions();
      }
    } catch (err) {
      console.error('Грешка при изтриване:', err);
    }
  };

  // Изтриване на цяла чат сесия (избрания потребител)
  const deleteSelectedSession = async () => {
    if (!selectedSession) return;
    if (!confirm(`Сигурни ли сте, че искате да изтриете ЦЕЛИЯ чат с ${selectedSession.visitor_name || 'Анонимен'}? Това действие е необратимо!`)) return;
    
    try {
      const res = await fetch(`/api/chat/admin?sessionId=${selectedSession.session_id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSessions();
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Грешка при изтриване на сесия:', err);
    }
  };

  // Блокиране на потребител
  const blockUser = async () => {
    if (!selectedSession) return;
    if (!confirm(`Сигурни ли сте, че искате да БЛОКИРАТЕ ${selectedSession.visitor_name || 'Анонимен'}? Той няма да може да ви пише повече.`)) return;
    
    try {
      const res = await fetch('/api/chat/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSession.session_id })
      });
      if (res.ok) {
        await loadSessions();
        alert(`Потребителят ${selectedSession.visitor_name || 'Анонимен'} е блокиран.`);
      }
    } catch (err) {
      console.error('Грешка при блокиране:', err);
    }
  };

  // Изтриване на потребител (пълно премахване)
  const deleteUser = async () => {
    if (!selectedSession) return;
    if (!confirm(`Сигурни ли сте, че искате да ИЗТРИЕТЕ ПОТРЕБИТЕЛЯ ${selectedSession.visitor_name || 'Анонимен'}? Това действие е необратимо и целият чат ще бъде премахнат от списъка.`)) return;
    
    try {
      const res = await fetch(`/api/chat/admin?sessionId=${selectedSession.session_id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSessions();
        setSelectedSession(null);
        setMessages([]);
        alert(`Потребителят ${selectedSession.visitor_name || 'Анонимен'} е изтрит.`);
      }
    } catch (err) {
      console.error('Грешка при изтриване на потребител:', err);
    }
  };

  // Запис на чата във файл
  const saveChatToFile = () => {
    if (!selectedSession || messages.length === 0) {
      alert('Няма съобщения за запис');
      return;
    }
    
    const now = new Date();
    const fileName = `${selectedSession.visitor_name || 'anonymous'}_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.txt`;
    
    let content = `=== Чат с ${selectedSession.visitor_name || 'Анонимен'} ===\n`;
    content += `Дата на запис: ${now.toLocaleString('bg-BG')}\n`;
    content += `Session ID: ${selectedSession.session_id}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    messages.forEach(msg => {
      const sender = msg.sender === 'admin' ? 'Администратор' : (selectedSession.visitor_name || 'Посетител');
      const time = new Date(msg.created_at).toLocaleString('bg-BG');
      content += `[${time}] ${sender}: ${msg.message}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.session_id);
      const interval = setInterval(() => loadMessages(selectedSession.session_id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #2e1065)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Зареждане на чатовете...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #2e1065)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>💬 Администраторски чат</h1>
          <Link href="/admin" style={{ background: '#8b5cf6', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', textDecoration: 'none' }}>
            ← Назад към админ панела
          </Link>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', height: 'calc(100vh - 120px)' }}>
          {/* Списък със сесии */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', overflowY: 'auto' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: 'white' }}>Активни чатове</h3>
              <p style={{ color: '#64748b', fontSize: '12px' }}>{sessions.length} активни разговора</p>
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                Няма активни чатове
              </div>
            ) : (
              sessions.map(ses => (
                <div
                  key={ses.session_id}
                  onClick={() => setSelectedSession(ses)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    background: selectedSession?.session_id === ses.session_id ? 'rgba(139, 92, 246, 0.2)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{ses.visitor_name || 'Анонимен'}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {ses.unreadCount > 0 && (
                        <span style={{ background: '#ef4444', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', color: 'white' }}>
                          {ses.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {ses.lastMessage?.message?.substring(0, 40) || 'Няма съобщения'}...
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                    {new Date(ses.last_message_at).toLocaleString('bg-BG')}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Чат прозорец за админ */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
            {selectedSession ? (
              <>
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ color: 'white' }}>Чат с {selectedSession.visitor_name || 'Анонимен'}</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>
                      Няма съобщения в този чат
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} style={{
                        marginBottom: '1rem',
                        display: 'flex',
                        justifyContent: msg.sender === 'admin' ? 'flex-end' : 'flex-start',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.5rem 1rem',
                          borderRadius: '12px',
                          background: msg.sender === 'admin' ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          maxWidth: '70%'
                        }}>
                          {msg.message}
                        </div>
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          style={{
                            background: 'rgba(255,0,0,0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: 'white'
                          }}
                          title="Изтрий съобщение"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Четирите бутона долу */}
                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={deleteSelectedSession}
                      style={{
                        background: '#ea580c',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                      title="Изтрива само този чат (потребителят може да пише отново)"
                    >
                      🗑️ Изтрий чат
                    </button>
                    <button 
                      onClick={blockUser}
                      style={{
                        background: '#7c3aed',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                      title="Блокира потребителя (не може да пише, но чатът остава)"
                    >
                      🚫 Блокирай потребител
                    </button>
                    <button 
                      onClick={deleteUser}
                      style={{
                        background: '#dc2626',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                      title="Изтрива потребителя от списъка (целият чат се премахва)"
                    >
                      ❌ Изтрий потребител
                    </button>
                    <button 
                      onClick={saveChatToFile}
                      style={{
                        background: '#059669',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                      title="Запази чата на диска"
                    >
                      💾 Запиши чат
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Напиши отговор..."
                      style={{
                        width: '250px',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.5)',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        outline: 'none'
                      }}
                    />
                    <button onClick={sendMessage} style={{
                      padding: '0.5rem 1rem',
                      background: '#8b5cf6',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      📤 Изпрати
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                  <p>Избери чат от ляво</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}