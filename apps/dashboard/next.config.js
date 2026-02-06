/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type checking during build (handled by IDE/linter)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build (handled by IDE/linter)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
