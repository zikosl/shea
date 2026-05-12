import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const publicUrl =
    process.env.NEXT_PUBLIC_PUBLIC_URL ||
    (process.env.SHEA_DOMAIN ? `https://${process.env.SHEA_DOMAIN}` : 'https://shea.openzey.com');
const publicHostname = new URL(publicUrl).hostname;

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: publicHostname,
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            }
        ],
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
