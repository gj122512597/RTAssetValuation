import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Segmented, Button, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '@/api/client';
import { hedonicPredict } from '@/utils/hedonicModel';
import { shapFromHedonic } from '@/utils/pricingModels';
import { getActiveModel } from '@/services/modelService';
import { useAssetStore } from '@/stores/assetStore';
import NewAssetForm from '@/components/valuation/NewAssetForm';
import NewAssetResult from '@/components/valuation/NewAssetResult';
import { NewAssetInput, NeighborCompetitor, NewAssetValuationResult } from '@/components/valuation/types';
import type { PricingModel } from '@/types';

const { Title, Text } = Typography;

const DECO_MAP: Record<string, number> = { rough: 0, simple: 1, standard: 2, fine: 3 };
const CERT_MAP: Record<string, number> = { complete: 0, pending: 1, missing: 2 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function fetchNeighbors(input: NewAssetInput): Promise<NeighborCompetitor[]> {
  const toNeighbor = (r: any): NeighborCompetitor | null => {
    if (typeof r.lng !== 'number' || typeof r.lat !== 'number') return null;
    return {
      id: r.id,
      name: r.name,
      list_price: Number(r.list_price) || 0,
      type: r.type,
      source: r.source,
      lng: r.lng,
      lat: r.lat,
      distanceKm: haversine(input.lng, input.lat, r.lng, r.lat),
    };
  };

  try {
    const rows = (await api.competitors.list({
      lng: input.lng,
      lat: input.lat,
      type: input.businessType,
      radius_km: input.radiusKm,
    })) as unknown[];
    const mapped = rows.map(toNeighbor).filter((n): n is NeighborCompetitor => !!n);
    if (mapped.length) return mapped;
    throw new Error('empty');
  } catch {
    // 后端不可用：用前端已加载的竞品（store）做近邻兜底
    const all = useAssetStore.getState().competitors;
    return all
      .filter((c) => c.lnglat && c.type === input.businessType)
      .map((c) => ({
        id: c.id,
        name: c.name,
        list_price: c.list_price,
        type: c.type,
        source: c.source,
        lng: c.lnglat![0],
        lat: c.lnglat![1],
        distanceKm: haversine(input.lng, input.lat, c.lnglat![0], c.lnglat![1]),
      }))
      .filter((n) => n.distanceKm <= input.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export default function NewAssetValuationPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<PricingModel>('comparative');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NewAssetValuationResult | null>(null);
  const [neighbors, setNeighbors] = useState<NeighborCompetitor[]>([]);
  const [lastInput, setLastInput] = useState<NewAssetInput | null>(null);

  const loadAll = useAssetStore((s) => s.loadAll);

  // 进入页面时预加载竞品，作为后端不可用时的兜底
  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCompute = useCallback(
    async (input: NewAssetInput, m: PricingModel) => {
      setLoading(true);
      setLastInput(input);
      try {
        const model = await getActiveModel(m);
        const ns = await fetchNeighbors(input);
        const neighborMedian = median(ns.map((n) => n.list_price).filter((p) => p > 0));

        const x: Record<string, number> = {
          subway_distance: input.subwayDistance,
          condition_score: input.conditionScore,
          decoration_idx: DECO_MAP[input.decoration],
          certificate_idx: CERT_MAP[input.certificate],
          is_cbd: input.isCbd ? 1 : 0,
          is_inner: input.isInner ? 1 : 0,
          log_area: Math.log10(input.area) / 10,
          school_score: input.schoolScore,
          commercial_density: input.commercialDensity,
          deco_age: clamp(2024 - input.lastRenovationYear, 0, 30),
          free_rent_idx: Math.floor(input.freeRentDays / 15),
          base_price_log: neighborMedian > 0 ? Math.log10(neighborMedian) / 2 : 0.42,
        };

        const { prediction } = hedonicPredict(model, x);
        const shap = shapFromHedonic(x, model);

        const [lowF, highF] = m === 'comparative' ? [0.88, 1.12] : [0.85, 1.15];
        const center = prediction;
        const validPrices = ns.map((n) => n.list_price).filter((p) => p > 0);
        const percentile = validPrices.length
          ? Math.round((validPrices.filter((p) => p <= center).length / validPrices.length) * 100)
          : 0;
        let confidence =
          0.8 +
          (input.certificate === 'complete' ? 0.05 : 0) +
          (input.conditionScore >= 7 ? 0.05 : 0) -
          (input.freeRentDays > 90 ? 0.1 : 0);
        confidence = Number(clamp(confidence, 0.5, 0.95).toFixed(2));

        setResult({
          method: m,
          center,
          rangeLow: Number((center * lowF).toFixed(2)),
          rangeHigh: Number((center * highF).toFixed(2)),
          contributions: shap,
          benchmarkMedian: Number(neighborMedian.toFixed(2)),
          neighborCount: ns.length,
          radiusKm: input.radiusKm,
          percentile,
          confidence,
          modelName: model.name,
          r2: model.r2,
        });
        setNeighbors(ns.sort((a, b) => a.distanceKm - b.distanceKm));

        if (ns.length === 0) {
          message.warning('该位置周边未检索到竞品，基准价采用默认代理值');
        }
      } catch (e) {
        message.error('估价失败：' + (e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f5f5f5' }}>
      <Card size="small" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            新资产估价录入
          </Title>
          <Text type="secondary">录入特征 → 调用训练好的 Hedonic 模型 + 周边竞品数据 → 建议租金</Text>
          <div style={{ marginLeft: 'auto' }}>
            <Segmented<PricingModel>
              value={method}
              onChange={(v) => {
                setMethod(v);
                if (lastInput) void runCompute(lastInput, v);
              }}
              options={[
                { label: '市场比较法', value: 'comparative' },
                { label: '历史数据法', value: 'historical' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Row gutter={12}>
        <Col xs={24} lg={9}>
          <NewAssetForm loading={loading} onSubmit={(input) => void runCompute(input, method)} />
        </Col>
        <Col xs={24} lg={15}>
          <NewAssetResult loading={loading} result={result} neighbors={neighbors} />
        </Col>
      </Row>
    </div>
  );
}
