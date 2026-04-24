// app/api/youtube-top/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // За начало връщаме примерни данни
    const mockVideos = [
      { id: 1, title: 'Примерно видео 1', views: 1000, thumbnail: 'https://img.youtube.com/vi/uxSIvsoWIH8/mqdefault.jpg', videoUrl: 'https://youtube.com/watch?v=uxSIvsoWIH8' },
      { id: 2, title: 'Примерно видео 2', views: 500, thumbnail: 'https://img.youtube.com/vi/5xa0csmG-NE/mqdefault.jpg', videoUrl: 'https://youtube.com/watch?v=5xa0csmG-NE' },
    ];
    
    return NextResponse.json({ success: true, videos: mockVideos });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, videos: [] }, { status: 500 });
  }
}