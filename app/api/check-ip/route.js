import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  return ip;
}

// GET — проверка на IP и регистриране на посещение
export async function GET(request) {
  try {
    const ip = await getIP(request);

    // Търсим IP в базата
    const { data: existing } = await supabase
      .from('registrations')
      .select('*')
      .eq('ip_address', ip)
      .single();

    if (existing) {
      // Вече познат IP — обновяваме visit_count и last_visit_at
      const newCount = (existing.visit_count || 1) + 1;

      await supabase
        .from('registrations')
        .update({
          visit_count: newCount,
          previous_visit_at: existing.last_visit_at,
          last_visit_at: new Date().toISOString()
        })
        .eq('ip_address', ip);

      return NextResponse.json({
        status: 'returning',
        visit_count: newCount,
        email: existing.email || null
      });

    } else {
      //Ново IP — създаваме запис
      await supabase
        .from('registrations')
        .insert({
          ip_address: ip,
          visit_count: 1,
          last_visit_at: new Date().toISOString(),
          is_public_ip: !ip.startsWith('127.') && !ip.startsWith('::1')
        });

      return NextResponse.json({
        status: 'new',
        visit_count: 1,
        email: null
      });
    }

  } catch (err) {
    console.error('check-ip error:', err);
    return NextResponse.json(
      { error: 'Server error', visit_count: 1 },
      { status: 500 }
    );
  }
}

// POST — допълнителни действия (check_email, failed_attempt, reset_attempts)
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email } = body;
    const ip = await getIP(request);

    if (action === 'check_email') {
      const { data } = await supabase
        .from('registrations')
        .select('email, visit_count')
        .eq('ip_address', ip)
        .single();

      return NextResponse.json({ 
        has_email: !!data?.email,
        email: data?.email || null
      });
    }

    if (action === 'failed_attempt') {
      const { data: existing } = await supabase
        .from('registrations')
        .select('failed_attempts')
        .eq('ip_address', ip)
        .single();

      const attempts = (existing?.failed_attempts || 0) + 1;

      await supabase
        .from('registrations')
        .update({ failed_attempts: attempts })
        .eq('ip_address', ip);

      return NextResponse.json({ failed_attempts: attempts });
    }

    if (action === 'reset_attempts') {
      await supabase
        .from('registrations')
        .update({ failed_attempts: 0 })
        .eq('ip_address', ip);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('check-ip POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}