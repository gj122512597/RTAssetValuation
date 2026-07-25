import AmapMapView from './AmapMapView';
import type { Asset, CompetitorForRadar } from '@/types';

interface MapViewProps {
  focusAsset?: Asset;
  onMarkerClick: (asset: Asset) => void;
  detailMode?: boolean;
  detailRadiusKm?: number;
  detailCompetitors?: CompetitorForRadar[];
}

/**
 * 地图视图总入口（当前唯一引擎：AMap 高德）
 *
 * 历史支持过 Mapbox / ArcGIS / OSM 多引擎切换，已经按需求移除。
 * 后续若要切回 ArcGIS，只需在 MapView.tsx 增加一层分发即可。
 */
export default function MapView(props: MapViewProps) {
  return <AmapMapView {...props} />;
}
