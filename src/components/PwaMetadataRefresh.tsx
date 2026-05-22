import { useEffect } from "react";

const PWA_REFRESH_VERSION = "hyttekalender-2";
const PWA_REFRESH_KEY = `hk_pwa_refresh_${PWA_REFRESH_VERSION}`;

function isIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewOrLocalHost(hostname: string) {
  return (
    hostname.includes("id-preview--") ||
    hostname.includes("lovableproject.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export function PwaMetadataRefresh() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (isIframe() || isPreviewOrLocalHost(window.location.hostname)) return;
    if (window.localStorage.getItem(PWA_REFRESH_KEY) === "done") return;

    window.localStorage.setItem(PWA_REFRESH_KEY, "done");
    navigator.serviceWorker
      .register(`/sw.js?v=${PWA_REFRESH_VERSION}`, { scope: "/" })
      .then((registration) => registration.update())
      .catch(() => {
        window.localStorage.removeItem(PWA_REFRESH_KEY);
      });
  }, []);

  return null;
}