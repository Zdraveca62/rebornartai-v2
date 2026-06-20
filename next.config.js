import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // твоите съществуващи настройки остават тук
};

export default withNextIntl(nextConfig);