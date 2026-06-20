// app/api/auth/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Невалиден JSON' }, { status: 400 });
  }

  const { action, email, password } = body;
  const ip = getClientIP(request);

  // ── link_email ────────────────────────────────────────────────────────────
  if (action === 'link_email') {
    if (!email) return NextResponse.json({ error: 'Липсва email' }, { status: 400 });

    console.log('[auth] link_email → IP:', ip, '| email:', email);

    // Провери дали записът съществува
    const { data: existing, error: findError } = await supabase
      .from('registrations')
      .select('ip_address')
      .eq('ip_address', ip)
      .maybeSingle();

    console.log('[auth] existing record:', existing, '| findError:', findError);

    if (existing) {
      // Записът съществува → update
      const { data, error } = await supabase
        .from('registrations')
        .update({ email })
        .eq('ip_address', ip)
        .select();

      console.log('[auth] update result:', data, '| error:', error);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, updated: data });
    } else {
      // Записът НЕ съществува → insert
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          ip_address: ip,
          email,
          visit_count: 1,
          failed_attempts: 0,
          is_public_ip: true,
          last_visit_at: new Date().toISOString(),
        })
        .select();

      console.log('[auth] insert result:', data, '| error:', error);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, inserted: data });
    }
  }

  // ── login ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ user: data.user, session: data.session });
  }

  // ── signup ────────────────────────────────────────────────────────────────
  if (action === 'signup') {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Автоматично свърже email с IP записа
    const { data: existing } = await supabase
      .from('registrations')
      .select('ip_address')
      .eq('ip_address', ip)
      .maybeSingle();

    if (existing) {
      await supabase.from('registrations').update({ email }).eq('ip_address', ip);
    } else {
      await supabase.from('registrations').insert({
        ip_address: ip, email, visit_count: 1, failed_attempts: 0,
        is_public_ip: true, last_visit_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ user: data.user });
  }

  return NextResponse.json({ error: 'Непознат action' }, { status: 400 });
}
