import { useEffect, useMemo } from 'react';
import { List, Empty, Spin, Alert, Tabs, Tag, Button, Space } from 'antd';
import { ListSkeleton, EmptyState } from '@/components/common/StateViews';
import { ExperimentOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '@/stores/assetStore';
import RiskTag from '@/components/common/RiskTag';
import MapView from '@/components/map/MapView';
import HeatLegend from '@/components/map/HeatLegend';
import StatBar from '@/components/dashboard/StatBar';
import LayerControlPanel from '@/components/dashboard/LayerControlPanel';
import type { Asset } from '@/types';

export default function HomePage() {
  const navigate = useNavigate();
  const assets = useAssetStore((s) => s.assets);
  const competitors = useAssetStore((s) => s.competitors);
  const loading = useAssetStore((s) => s.loading);
  const error = useAssetStore((s) => s.error);
  const loadAll = useAssetStore((s) => s.loadAll);
  const setSelectedId = useAssetStore((s) => s.setSelectedAssetId);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // 用 useMemo 派生过滤结果，避免 store selector 每次返回新数组导致无限渲染
  const selectedBusinessTypes = useAssetStore((s) => s.selectedBusinessTypes);
  const selectedBatches = useAssetStore((s) => s.selectedBatches);
  const currentUser = useAssetStore((s) => s.currentUser);

  const visibleAssets = useMemo(
    () =>
      assets.filter((a) => {
        if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(a.type as never))
          return false;
        if (selectedBatches.length > 0 && !selectedBatches.includes(a.received_batch))
          return false;
        if (currentUser.scope === 'region' && currentUser.region && a.region !== currentUser.region)
          return false;
        return true;
      }),
    [assets, selectedBusinessTypes, selectedBatches, currentUser]
  );
  const visibleCompetitors = useMemo(
    () =>
      competitors.filter((c) => {
        if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(c.type as never))
          return false;
        if (currentUser.scope === 'region' && currentUser.region && c.region !== currentUser.region)
          return false;
        return true;
      }),
    [competitors, selectedBusinessTypes, currentUser]
  );

  const stats = useMemo(() => {
    if (assets.length === 0) return { count: 0, avg: 0, vacant: 0 };
    const total = assets.reduce((acc, a) => acc + a.estimated_price, 0);
    return {
      count: visibleAssets.length,
      avg: Number((total / assets.length).toFixed(2)),
      vacant: visibleAssets.filter((a) => a.status === 'vacant').length,
    };
  }, [assets, visibleAssets]);

  const handleSelect = (asset: Asset) => {
    setSelectedId(asset.id);
    navigate(`/asset/${asset.id}`);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-100">
      {/* 全屏地图 */}
      <div className="absolute inset-0">
        <MapView onMarkerClick={handleSelect} />
      </div>

      {/* 顶部统计栏 */}
      <div className="absolute top-4 left-4 right-[376px] z-20">
        <div className="mb-2">
          <div className="bg-white/95 rounded-lg shadow-card px-4 py-2 flex items-center gap-3">
            {/* 品牌标识 */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                XX
              </div>
              <div className="leading-tight">
                <span className="text-sm font-bold text-ink-900">XX地产</span>
                <span className="text-ink-300 mx-1.5">·</span>
                <span className="text-xs text-ink-600">全域资产 GIS 总览</span>
              </div>
            </div>
            {/* 分隔线 */}
            <div className="h-7 w-px bg-gray-200" />
            {/* 导航入口 */}
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<GlobalOutlined />}
                onClick={() => navigate('/intel')}
              >
                数据情报站
              </Button>
              <Button
                type="text"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/due-diligence')}
              >
                尽调工作台
              </Button>
              <Button
                type="text"
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => navigate('/valuation/new')}
              >
                新资产估价
              </Button>
            </Space>
            {/* 右侧数据时间戳 */}
            <div className="ml-auto text-[10px] text-ink-400 leading-tight text-right">
              <div>Data: 2026-07-24</div>
              <div className="text-ink-300">M1+ · v0.1</div>
            </div>
          </div>
        </div>
        <StatBar />
        {error && (
          <div className="mt-2">
            <Alert type="error" message={error} showIcon />
          </div>
        )}
      </div>

      {/* 右下 HeatLegend */}
      <HeatLegend />

      {/* 右侧浮动 Sidebar */}
      <div className="absolute top-4 right-4 bottom-4 w-[360px] z-20 flex flex-col bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">资产概览</div>
            <div className="text-[11px] text-gray-500">Asset Overview</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">可见/总数</div>
            <div className="text-sm font-semibold">
              {stats.count} / {assets.length}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100">
          <Tabs
            defaultActiveKey="layer"
            items={[
              {
                key: 'layer',
                label: '图层',
                children: <LayerControlPanel />,
              },
              {
                key: 'assets',
                label: `资产 (${stats.count})`,
                children: loading ? (
                  <ListSkeleton rows={5} />
                ) : (
                  <List
                    dataSource={visibleAssets}
                    style={{ maxHeight: 360, overflowY: 'auto' }}
                    locale={{
                      emptyText: (
                        <EmptyState
                          icon="📍"
                          description="当前筛选条件下没有匹配资产"
                          hint="试试调整上方业态/批次筛选，或切换'数据规模'到 200+300"
                          compact
                        />
                      ),
                    }}
                    renderItem={(item) => (
                      <List.Item
                        className="!px-5 !py-2.5 cursor-pointer hover:bg-blue-50/60 transition-colors"
                        onClick={() => handleSelect(item)}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate text-sm text-ink-900" title={item.name}>
                              {item.name}
                            </span>
                            <RiskTag status={item.status} confidence={item.confidence} />
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink-500">
                            <span>
                              {item.region} · {item.area.toLocaleString()}㎡
                            </span>
                            <span className="text-brand font-semibold">
                              ¥{item.estimated_price}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-300">
                            <Tag className="!m-0" bordered={false} color="default">
                              {item.type}
                            </Tag>
                            <span>{item.id}</span>
                            {item.days_vacant > 90 && (
                              <Tag className="!m-0" color="red" bordered={false}>
                                空置 {item.days_vacant} 天
                              </Tag>
                            )}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: 'comp',
                label: `竞品 (${visibleCompetitors.length})`,
                children: loading ? (
                  <ListSkeleton rows={4} />
                ) : (
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <List
                      dataSource={visibleCompetitors}
                      size="small"
                      locale={{
                        emptyText: (
                          <EmptyState
                            icon="🛰️"
                            description="暂无竞品数据"
                            hint="试试切换数据规模到 200+300 看到更完整的爬虫 mock"
                            compact
                          />
                        ),
                      }}
                      renderItem={(c) => (
                        <List.Item className="!px-5 !py-2 hover:bg-purple-50/40 transition-colors">
                          <div className="w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate" title={c.name}>
                                {c.name}
                              </span>
                              <Tag className="!m-0" color="purple" bordered={false}>
                                ¥{c.list_price}
                              </Tag>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500">
                              {c.region} · {c.type} · {c.source}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}