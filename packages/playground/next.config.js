/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Keep Node.js built-ins as externals on server so webpack doesn't bundle them
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('zlib');
    }

    return config;
  },
};

module.exports = nextConfig;
