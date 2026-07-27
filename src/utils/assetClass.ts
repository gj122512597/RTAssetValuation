import type { Asset } from '@/types';

/**
 * 资产类别判定：标准资产（标品） vs 非标资产
 *  - 标品：可比实例充足、Hedonic 模型可直接解释定价（写字楼/商铺/住宅等）
 *  - 非标：可比稀缺、依赖人工调研/修正、估价以参考区间为准（厂房/仓储/酒店/医疗/出现显著风险等）
 *
 * 判定融合「类型关键词」+「风险信号」，任一命中即视为非标。
 */
export type AssetClass = 'standard' | 'non_standard';

const NON_STANDARD_KEYWORDS = [
  'industrial',
  '厂房',
  '仓储',
  '物流',
  'data_center',
  '数据中心',
  '酒店',
  'hotel',
  'special',
  '养老',
  '医疗',
  '产业园',
];

export function assetClassOf(asset: Asset): AssetClass {
  const t = (asset.type ?? '').toLowerCase();
  const typeHit = NON_STANDARD_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
  const riskHit =
    (asset.hidden_risks ?? []).length > 0 ||
    (asset.features?.condition_score ?? 10) <= 3 ||
    (asset.days_vacant ?? 0) > 180;
  return typeHit || riskHit ? 'non_standard' : 'standard';
}
