/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit đọc font/data bằng fs.readFileSync với URL ở thời điểm import —
  // webpack bundle làm hỏng kiểu đối số này. Để pdfkit (và fontkit đi kèm)
  // chạy ngoài bundle, dùng trực tiếp từ node_modules trên server.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "fontkit"],
  },
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
