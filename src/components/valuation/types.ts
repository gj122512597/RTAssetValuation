import type {
  BusinessType,
  DecorationLevel,
  CertificateStatus,
  PricingModel,
  ShapContribution,
} from '@/types';

/** 新资产录入表单的输入 */
export interface NewAssetInput {
  name: string;
  businessType: BusinessType;
  region: string;
  lng: number;
  lat: number;
  area: number; // ㎡
  subwayDistance: number; // m
  conditionScore: number; // 1..10
  decoration: DecorationLevel;
  certificate: CertificateStatus;
  schoolScore: number; // 0..10
  commercialDensity: number; // 0..10
  lastRenovationYear: number;
  freeRentDays: number;
  isCbd: boolean;
  isInner: boolean;
  radiusKm: number;
}

/** 周边竞品（已算距离） */
export interface NeighborCompetitor {
  id: string;
  name: string;
  list_price: number;
  type: string;
  source: string;
  lng: number;
  lat: number;
  distanceKm: number;
}

/** 估价结果 */
export interface NewAssetValuationResult {
  method: PricingModel;
  center: number;
  rangeLow: number;
  rangeHigh: number;
  contributions: ShapContribution[];
  benchmarkMedian: number;
  neighborCount: number;
  radiusKm: number;
  percentile: number;
  confidence: number;
  modelName: string;
  r2: number;
}

export const DEFAULT_NEW_ASSET: NewAssetInput = {
  name: '新录入资产',
  businessType: 'office',
  region: '北京/朝阳',
  lng: 116.46,
  lat: 39.913,
  area: 5000,
  subwayDistance: 600,
  conditionScore: 7,
  decoration: 'standard',
  certificate: 'complete',
  schoolScore: 7,
  commercialDensity: 6,
  lastRenovationYear: 2018,
  freeRentDays: 30,
  isCbd: true,
  isInner: false,
  radiusKm: 3,
};
