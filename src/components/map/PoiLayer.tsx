import { Source, Layer, Marker } from 'react-map-gl';
import type { PoiDataset } from '@/types';

interface Props {
  dataset: PoiDataset;
  showMetro: boolean;
  showDistricts: boolean;
}

/**
 * POI 覆盖层（M4 P3-2）
 *  - 地铁线（GeoJSON LineString）
 *  - 商圈（半径圆）
 */
export default function PoiLayer({ dataset, showMetro, showDistricts }: Props) {
  if (!dataset) return null;

  const metroData = {
    type: 'FeatureCollection' as const,
    features: dataset.metro.map((line) => ({
      type: 'Feature' as const,
      properties: { color: line.color, name: line.name },
      geometry: { type: 'LineString' as const, coordinates: line.coordinates },
    })),
  };

  const districtsData = {
    type: 'FeatureCollection' as const,
    features: dataset.districts.map((d) => ({
      type: 'Feature' as const,
      properties: { name: d.name, level: d.level },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [circleCoords(d.center, d.radius_km)],
      },
    })),
  };

  return (
    <>
      {showMetro && (
        <Source id="metro-lines" type="geojson" data={metroData as never}>
          <Layer
            id="metro-lines-stroke"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': 0.85,
            }}
          />
        </Source>
      )}

      {showDistricts && (
        <>
          <Source id="biz-districts" type="geojson" data={districtsData as never}>
            <Layer
              id="biz-districts-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'level'],
                  'A', '#fbbf24',
                  'B', '#60a5fa',
                  'C', '#94a3b8',
                  '#cbd5e1',
                ],
                'fill-opacity': 0.12,
              }}
            />
            <Layer
              id="biz-districts-line"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'level'],
                  'A', '#f59e0b',
                  'B', '#3b82f6',
                  'C', '#94a3b8',
                  '#cbd5e1',
                ],
                'line-dasharray': [2, 2],
                'line-width': 1.2,
              }}
            />
          </Source>
          {dataset.districts.map((d) => (
            <Marker
              key={d.id}
              longitude={d.center[0]}
              latitude={d.center[1]}
              anchor="center"
            >
              <div className="text-[10px] font-semibold text-amber-700 bg-white/80 px-1.5 py-0.5 rounded shadow-sm pointer-events-none">
                {d.name}
              </div>
            </Marker>
          ))}
        </>
      )}
    </>
  );
}

/** 给定中心 + km 半径生成多边形顶点，用于商圈覆盖 */
function circleCoords(c: [number, number], rkm: number, steps = 64): [number, number][] {
  const coords: [number, number][] = [];
  const dLat = 1 / 111.32;
  const dLng = 1 / (111.32 * Math.cos((c[1] * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([c[0] + Math.cos(a) * rkm * dLng, c[1] + Math.sin(a) * rkm * dLat]);
  }
  return coords;
}
