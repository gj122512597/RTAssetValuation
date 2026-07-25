import { Source, Layer } from 'react-map-gl';
import { circlePolygon } from '@/utils/geo';

interface Props {
  /** 圆心（资产经纬度） */
  center: [number, number];
  /** 半径 km */
  radiusKm: number;
  /** 多边形填充色 */
  color?: string;
}

/**
 * 辐射圈（M2 P2-3）
 * 在地图上绘制一个以 center 为圆心、半径为 radiusKm 的多边形覆盖层。
 */
export default function RadiusCircle({ center, radiusKm, color = '#1f6feb' }: Props) {
  const coords = circlePolygon(center, radiusKm, 80);
  const data = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
      },
    ],
  };

  return (
    <Source id={`radius-${radiusKm}`} type="geojson" data={data as never}>
      <Layer
        id={`radius-fill-${radiusKm}`}
        type="fill"
        paint={{
          'fill-color': color,
          'fill-opacity': 0.06,
        }}
      />
      <Layer
        id={`radius-line-${radiusKm}`}
        type="line"
        paint={{
          'line-color': color,
          'line-width': 1.5,
          'line-dasharray': [3, 2],
        }}
      />
    </Source>
  );
}
