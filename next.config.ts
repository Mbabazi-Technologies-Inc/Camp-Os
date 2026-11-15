import type { NextConfig } from "next";

const exfat = process.env.EXFAT_DRIVE === "1";

const nextConfig: NextConfig = {
  // Dev-only: allow the dev server's internal requests when the app is opened
  // from a phone on the LAN or through a forwarded port in a cloud dev
  // environment (GitHub Codespaces, Gitpod). Without these, Next warns about
  // the cross-origin request and will eventually block it.
  allowedDevOrigins: [
    "*.app.github.dev",
    "*.githubpreview.dev",
    "*.gitpod.io",
    "*.gitpod.dev",
  ],
  // EXFAT_DRIVE=1 is set by .claude/launch.json when the project sits on an
  // exFAT drive. macOS writes "._" sidecar files beside everything in .next
  // there: Turbopack's dev cache fails to reopen with them, and the image
  // optimizer serves them instead of the photos.
  experimental: {
    turbopackFileSystemCacheForDev: !exfat,
  },
  images: {
    unoptimized: exfat,
  },
};

export default nextConfig;
