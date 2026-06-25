import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // твоите съществуващи настройки остават тук
   allowedDevOrigins: ['192.168.1.6'],
};

export default withNextIntl(nextConfig);
