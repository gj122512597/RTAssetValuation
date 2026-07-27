/**
 * 高德地图 JS API（Web 端 v2.0）加载与最小封装
 *
 *  - 使用官方 loader：@amap/amap-jsapi-loader
 *  - 不持有 React 内部状态，仅提供 AMap 实例创建
 *  - 支持 demo 占位（无 key 时回退到一个轻量 SVG canvas，地图标记正确）
 */

export interface AMapLoaded {
  AMap: typeof window.AMap;
}

let cached: Promise<AMapLoaded | null> | null = null;

export async function loadAMap(key?: string, securityJsCode?: string): Promise<AMapLoaded | null> {
  if (key && window.AMap) {
    return { AMap: window.AMap as typeof window.AMap };
  }
  if (cached) return cached;

  if (!key) return null;
  if (securityJsCode) {
    (window as Window)._AMapSecurityConfig = { securityJsCode };
  }

  cached = (async () => {
    try {
      const loader = (await import('@amap/amap-jsapi-loader')).default;
      const AMap = (await loader.load({
        key,
        version: '2.0',
        plugins: ['AMap.Marker', 'AMap.Text', 'AMap.Polyline', 'AMap.Polygon', 'AMap.Circle', 'AMap.PlaceSearch'],
      })) as unknown as typeof window.AMap;
      window.AMap = AMap;
      return { AMap };
    } catch (e) {
      console.error('AMap loader failed:', e);
      return null;
    }
  })();

  return cached;
}

export function getAmapKey(): string | undefined {
  return (import.meta.env.VITE_AMAP_KEY as string | undefined) || undefined;
}

export function getAmapSecurity(): string | undefined {
  return (import.meta.env.VITE_AMAP_SECURITY as string | undefined) || undefined;
}
