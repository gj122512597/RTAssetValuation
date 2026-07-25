/**
 * 地理工具（M2 P2-3 辐射圈）
 *  - 用 Haversine 计算经纬度距离（km）
 *  - 简单便宜、误差 ~0.5%
 */
const R = 6371; // km

export function haversineKm(
  a: [number, number],
  b: [number, number]
): number {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * 在 Mapbox/Maplibre 中绘制圆形覆盖物时，需要把米转换成"度"。
 * 在 zoom 较小时近似：1° ≈ 111.32 km（纬度方向）。
 * maplibre 的 Source/circle 是米制坐标，会自动处理 zoom，无需手算。
 */
export function bbox(
  center: [number, number],
  radiusKm: number
): [[number, number], [number, number]] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  return [
    [center[0] - dLng, center[1] - dLat],
    [center[0] + dLng, center[1] + dLat],
  ];
}

/** 将 km 半径内的 GeoJSON（圆心 + 距离）简化成一个 polygon 顶点列表，用于覆盖层 */
export function circlePolygon(
  center: [number, number],
  radiusKm: number,
  steps = 64
): [number, number][] {
  const coords: [number, number][] = [];
  const dLatPerKm = 1 / 111.32;
  const dLngPerKm = 1 / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = Math.sin(angle) * radiusKm * dLatPerKm;
    const dLng = Math.cos(angle) * radiusKm * dLngPerKm;
    coords.push([center[0] + dLng, center[1] + dLat]);
  }
  return coords;
}
