/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN?: string;
  /** 高德地图 JS API Key（Web 端） */
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_AMAP_SECURITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    AMap?: unknown;
    _AMapSecurityConfig?: unknown;
  }
}

export {};
