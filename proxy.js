import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['bg', 'en'],
  defaultLocale: 'bg',
  localePrefix: 'as-needed',
  localeDetection: false
});

export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)']
};