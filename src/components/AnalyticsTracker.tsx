import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a virtual pageview on each client-side route change so GA4,
 * Google Ads, Meta Pixel, and LinkedIn Insight Tag track SPA navigation
 * (not just the initial document load).
 *
 * The pixel scripts themselves live in index.html.
 */
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const url = location.pathname + location.search;

    try {
      // Google Analytics 4 + Google Ads (gtag)
      const gtag = (window as any).gtag;
      if (typeof gtag === "function") {
        gtag("event", "page_view", {
          page_path: url,
          page_location: window.location.href,
          page_title: document.title,
        });
      }

      // Meta Pixel
      const fbq = (window as any).fbq;
      if (typeof fbq === "function") {
        fbq("track", "PageView");
      }

      // LinkedIn Insight Tag
      const lintrk = (window as any).lintrk;
      if (typeof lintrk === "function") {
        lintrk("track");
      }
    } catch {
      // Tracking must never break the app.
    }
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;
