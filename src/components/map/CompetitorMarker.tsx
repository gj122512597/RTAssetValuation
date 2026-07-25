import { Marker } from 'react-map-gl';
import type { CompetitorForRadar } from '@/types';

interface Props {
  competitor: CompetitorForRadar;
}

/**
 * 竞品 Marker：紫色三角点，与正式资产的"红/绿/黄"形态明确区分。
 */
export default function CompetitorMarker({ competitor }: Props) {
  const color = '#a855f7';
  return (
    <Marker
      longitude={competitor.lnglat[0]}
      latitude={competitor.lnglat[1]}
      anchor="center"
    >
      <svg width="14" height="14" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 2,22" fill={color} stroke="white" strokeWidth="1.5" />
      </svg>
    </Marker>
  );
}
