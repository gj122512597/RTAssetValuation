import { useState, useCallback } from 'react';
import { Card, Button, Select, InputNumber, Progress, Alert, Space, Tag, Statistic, Row, Col, message } from 'antd';
import { ThunderboltOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { crawlPoiForAsset, crawlPoiForAssets, type PoiCrawlProgress } from '@/utils/amapPoiCrawler';
import { api } from '@/api/client';

const CATEGORY_LABELS: Record<string, string> = {
  metro: '地铁站', bus: '公交站', school: '学校', hospital: '医院', shopping: '购物', park: '公园',
};

export default function PoiCrawlPanel() {
  const assets = useAssetStore((s) => s.assets);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [batchLimit, setBatchLimit] = useState(10);
  const [radius, setRadius] = useState(1000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PoiCrawlProgress | null>(null);
  const [result, setResult] = useState<{
    fetched: number; saved: number; errors: string[]; byCategory?: Record<string, number>;
  } | null>(null);
  const [dbCount, setDbCount] = useState<number | null>(null);

  const refreshDbCount = useCallback(async () => {
    try {
      const stats = await api.stats.overview();
      setDbCount(stats.poi || 0);
    } catch { /* 后端未启动时忽略 */ }
  }, []);

  if (dbCount === null) void refreshDbCount();

  const handleCrawl = async () => {
    setRunning(true);
    setResult(null);
    setProgress(null);
    try {
      if (mode === 'single') {
        const asset = assets.find((a) => a.id === selectedAssetId);
        if (!asset) { message.error('请选择资产'); setRunning(false); return; }
        setProgress({ current: 1, total: 1, assetId: asset.id, assetName: asset.name, stage: '初始化...' });
        const r = await crawlPoiForAsset(asset, radius, (stage) => {
          setProgress({ current: 1, total: 1, assetId: asset.id, assetName: asset.name, stage });
        });
        setResult({ fetched: r.fetched, saved: r.saved, errors: r.errors, byCategory: r.byCategory });
        if (r.errors.length === 0) message.success(`拉取完成：${r.fetched} 条 POI，入库 ${r.saved} 条`);
        else message.warning(`完成但有 ${r.errors.length} 个错误`);
      } else {
        const targets = assets.slice(0, batchLimit);
        const r = await crawlPoiForAssets(targets, radius, (p) => setProgress(p));
        setResult({ fetched: r.totalFetched, saved: r.totalSaved, errors: r.errors });
        if (r.errors.length === 0) message.success(`批量完成：${r.processed} 资产，拉取 ${r.totalFetched} 条，入库 ${r.totalSaved} 条`);
        else message.warning(`完成但有 ${r.errors.length} 个错误`);
      }
      await refreshDbCount();
    } catch (e) {
      message.error(`拉取失败：${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#1677ff' }} />
          <span>高德 POI 真实拉取</span>
          <Tag color="green" bordered={false}>实时 API</Tag>
        </Space>
      }
      size="small"
      className="!shadow-card"
      extra={dbCount !== null && (
        <Tag color="blue" bordered={false} icon={<EnvironmentOutlined />}>数据库 POI: {dbCount}</Tag>
      )}
    >
      <div className="space-y-4">
        <Alert
          type="info"
          showIcon
          message="使用 AMap JS API PlaceSearch 插件，无需额外 Web 服务 Key"
          description="拉取的 POI 数据通过后端 API 直接写入 SQLite poi_data 表，与现有 mock 数据共存。支持 6 类 POI：地铁站 / 公交站 / 学校 / 医院 / 购物中心 / 公园。"
        />

        <Row gutter={12} align="middle">
          <Col>
            <Select value={mode} onChange={setMode} style={{ width: 120 }}
              options={[{ value: 'single', label: '单资产' }, { value: 'batch', label: '批量拉取' }]} />
          </Col>
          {mode === 'single' ? (
            <Col flex="auto">
              <Select value={selectedAssetId} onChange={setSelectedAssetId} placeholder="选择资产"
                showSearch optionFilterProp="label" style={{ width: '100%' }}
                options={assets.map((a) => ({ value: a.id, label: `${a.name} (${a.id})` }))} />
            </Col>
          ) : (
            <Col>
              <InputNumber value={batchLimit} onChange={(v) => setBatchLimit(v ?? 10)} min={1} max={50}
                addonBefore="前" addonAfter="个" style={{ width: 150 }} />
            </Col>
          )}
          <Col>
            <InputNumber value={radius} onChange={(v) => setRadius(v ?? 1000)} min={500} max={3000} step={500}
              addonAfter="米" style={{ width: 130 }} />
          </Col>
          <Col>
            <Button type="primary" icon={<ThunderboltOutlined />} loading={running} onClick={handleCrawl}
              disabled={mode === 'single' && !selectedAssetId}>
              开始拉取
            </Button>
          </Col>
        </Row>

        {progress && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">
                {mode === 'batch' && `(${progress.current}/${progress.total}) `}
                {progress.assetName} — {progress.stage}
              </span>
              <span className="text-xs text-gray-400">{pct}%</span>
            </div>
            <Progress percent={pct} size="small" status={running ? 'active' : 'normal'} />
          </div>
        )}

        {result && (
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="拉取总数" value={result.fetched} suffix="条" />
            </Col>
            <Col span={8}>
              <Statistic title="入库数量" value={result.saved} suffix="条" valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col span={8}>
              <Statistic title="错误" value={result.errors.length} suffix="个"
                valueStyle={result.errors.length > 0 ? { color: '#ff4d4f' } : undefined} />
            </Col>
          </Row>
        )}

        {result?.byCategory && Object.keys(result.byCategory).length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">分类统计</div>
            <Space wrap>
              {Object.entries(result.byCategory).map(([cat, count]) => (
                <Tag key={cat} color="blue" bordered={false}>
                  {CATEGORY_LABELS[cat] || cat}: {count}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {result?.errors && result.errors.length > 0 && (
          <Alert type="warning" showIcon message={`${result.errors.length} 个错误`}
            description={result.errors.slice(0, 3).join('；') + (result.errors.length > 3 ? '...' : '')} />
        )}

        <div className="text-[11px] text-gray-400">
          提示：单资产约需 2-3 秒（6 类 POI × 300ms 间隔）。批量 10 个资产约需 25-30 秒。
          后端服务需在 <code>localhost:3001</code> 运行才能入库。
        </div>
      </div>
    </Card>
  );
}
