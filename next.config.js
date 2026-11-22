/** @type {import('next').NextConfig} */
const nextConfig = {
  // Website cá nhân, không cho search engine index (requirement §8)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

module.exports = nextConfig;
