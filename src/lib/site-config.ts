/**
 * Single place for site-wide identity used by metadata, sitemap, robots, and
 * social preview images. Update SITE_URL here if a custom domain is added —
 * nothing else needs to change.
 */
export const SITE_URL = "https://dual-mode-one.vercel.app";
export const SITE_NAME = "Adrian Vela Portfolio";
export const SITE_DESCRIPTION =
  "Portfolio of Adrian Vela, a mechanical engineering student at UTRGV. Browse an editorial overview or explore an interactive terminal.";

/** True only for the actual production deployment on Vercel. */
export const IS_PRODUCTION = process.env.VERCEL_ENV === "production";
