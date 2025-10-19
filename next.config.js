/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium', 'puppeteer-core'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'electron': 'commonjs electron',
        'playwright-core/lib/server/electron/electron': 'commonjs playwright-core/lib/server/electron/electron',
      });
    }

    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.electron = false;

    config.module.rules.push(
      {
        test: /\.(ttf|woff2?|eot)$/,
        type: 'asset/resource',
      },
      {
        test: /\.html$/i,
        type: 'asset/source',
      },
    );

    return config;
  },
};

module.exports = nextConfig;
