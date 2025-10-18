/**
 * SEO Head Component
 * Manages meta tags and SEO-related head elements
 */

import { useEffect } from 'react';

export function SEOHead() {
  useEffect(() => {
    // Add canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = window.location.origin + window.location.pathname;
      document.head.appendChild(canonical);
    }

    // Add sitemap link
    let sitemapLink = document.querySelector('link[rel="sitemap"]');
    if (!sitemapLink) {
      sitemapLink = document.createElement('link');
      sitemapLink.rel = 'sitemap';
      sitemapLink.type = 'application/xml';
      sitemapLink.href = '/sitemap.xml';
      document.head.appendChild(sitemapLink);
    }

    // Add robots meta if not present
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
      document.head.appendChild(robotsMeta);
    }
  }, []);

  return null;
}
