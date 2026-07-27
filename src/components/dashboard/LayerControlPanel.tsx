import { Segmented, Checkbox, Avatar, Select } from 'antd';
import {
  GlobalOutlined,
  ClusterOutlined,
  AppstoreOutlined,
  HeatMapOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { PRICE_BUCKETS } from '@/components/map/AssetMarker';
import type { BusinessType, ReceivedBatch, RegionLayerMode } from '@/types';

const BUSINESS_OPTIONS: { value: BusinessType; label: string; emoji: string }[] = [
  { value: 'office', label: '写字楼', emoji: '🏢' },
  { value: 'retail', label: '商铺', emoji: '🏪' },
  { value: 'hotel', label: '酒店', emoji: '🏨' },
  { value: 'apartment', label: '公寓', emoji: '🏠' },
  { value: 'plant', label: '厂房', emoji: '🏭' },
  { value: 'warehouse', label: '仓库', emoji: '📦' },
];

const BATCH_OPTIONS: { value: ReceivedBatch; label: string }[] = [
  { value: 'batch-1', label: '一批' },
  { value: 'batch-2', label: '二批' },
  { value: 'batch-3', label: '三批' },
  { value: 'batch-4', label: '四批' },
];

const REGION_OPTIONS = [
  { value: 'none', label: '关闭' },
  { value: 'cluster', label: '聚合' },
  { value: 'district', label: '行政区' },
];

const USER_OPTIONS = [
  { value: 'global', label: '总部视角（全局）' },
  { value: 'region:朝阳区', label: '一线 - 朝阳区' },
  { value: 'region:海淀区', label: '一线 - 海淀区' },
  { value: 'region:通州区', label: '一线 - 通州区' },
];

/**
 * 右侧 Sidebar【图层】tab 内容：
 *   [过滤]  业态 + 批次 + 区域聚合
 *   [叠加]  宏观图层 + 数据规模
 * 控件分组更紧致，认知负担砍半
 */
export default function LayerControlPanel() {
  const selectedBusinessTypes = useAssetStore((s) => s.selectedBusinessTypes);
  const selectedBatches = useAssetStore((s) => s.selectedBatches);
  const regionLayer = useAssetStore((s) => s.regionLayer);
  const currentUser = useAssetStore((s) => s.currentUser);
  const toggleBusinessType = useAssetStore((s) => s.toggleBusinessType);
  const toggleBatch = useAssetStore((s) => s.toggleBatch);
  const selectedPriceBuckets = useAssetStore((s) => s.selectedPriceBuckets);
  const togglePriceBucket = useAssetStore((s) => s.togglePriceBucket);
  const setRegionLayer = useAssetStore((s) => s.setRegionLayer);
  const setCurrentUser = useAssetStore((s) => s.setCurrentUser);
  const showMetro = useAssetStore((s) => s.showMetro);
  const showDistricts = useAssetStore((s) => s.showDistricts);
  const showHeatmap = useAssetStore((s) => s.showHeatmap);
  const togglePoi = useAssetStore((s) => s.togglePoi);
  const assets = useAssetStore((s) => s.assets);

  const setBusiness = (vals: string[]) => {
    useAssetStore.getState().setBusinessTypes(vals as BusinessType[]);
  };

  const onUser = (val: string) => {
    if (val === 'global') {
      setCurrentUser({ name: '王明 · 总部', scope: 'global' });
    } else {
      const region = val.replace('region:', '');
      setCurrentUser({ name: `一线 · ${region}`, scope: 'region', region });
    }
  };

  const userValue =
    currentUser.scope === 'global' ? 'global' : `region:${currentUser.region ?? ''}`;

  return (
    <div className="text-sm">
      {/* ① 用户视角（始终置顶，权限相关） */}
      <div className="px-4 py-2.5 border-b border-ink-100">
        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-ink-500">
          <Avatar size={16} icon={<GlobalOutlined />} style={{ backgroundColor: '#1f6feb' }} />
          <span>用户视角</span>
          <span className="ml-auto text-[10px] text-ink-300">
            权限：{currentUser.scope === 'global' ? '全局' : currentUser.region}
          </span>
        </div>
        <Select
          className="w-full"
          size="small"
          value={userValue}
          options={USER_OPTIONS}
          onChange={onUser}
        />
      </div>

      {/* ② 数据规模（合并后统一数据集：手写 25 + 业务 demo 200 = 225 资产） */}
      <div className="px-4 py-2.5 border-b border-ink-100">
        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-ink-500">
          <HeatMapOutlined />
          <span>数据规模</span>
          <span className="ml-auto text-[10px] text-ink-300">已加载 {assets.length}</span>
        </div>
        <div className="text-[11px] text-ink-500 leading-snug break-words">
          统一数据集 · 225 资产（手写 25 + 生成 200）+ 325 竞品（手写 25 + 生成 300）+ 876 历史成交 + 26 POI，已全量入库
        </div>
      </div>

      {/* ③ 过滤组：业态 + 批次 + 区域 */}
      <Section title="过滤资产" icon={<AppstoreOutlined />}>
        <div className="space-y-3">
          <div>
            <SubLabel>业态</SubLabel>
            <Checkbox.Group
              className="w-full"
              value={selectedBusinessTypes}
              onChange={(vals) => setBusiness(vals as string[])}
            >
              <div className="grid grid-cols-3 gap-1.5">
                {BUSINESS_OPTIONS.map((o) => (
                  <Checkbox key={o.value} value={o.value} className="!mr-0">
                    <span className="text-xs">
                      {o.emoji} {o.label}
                    </span>
                  </Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </div>

          <div>
            <SubLabel>接收批次</SubLabel>
            <div className="flex gap-1.5 flex-wrap">
              {BATCH_OPTIONS.map((b) => {
                const active = selectedBatches.includes(b.value);
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => toggleBatch(b.value)}
                    className={
                      'px-2.5 py-1 text-xs rounded-full border transition-colors ' +
                      (active
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-ink-700 border-ink-100 hover:border-brand')
                    }
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SubLabel>单价档（元/㎡·天）</SubLabel>
            <div className="flex gap-1.5 flex-wrap">
              {PRICE_BUCKETS.map((b) => {
                const active = selectedPriceBuckets.includes(b.label);
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => togglePriceBucket(b.label)}
                    className={
                      'px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1 ' +
                      (active
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-ink-700 border-ink-100 hover:border-brand')
                    }
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SubLabel>区域聚合</SubLabel>
            <Segmented<RegionLayerMode>
              className="w-full"
              size="small"
              block
              value={regionLayer}
              options={REGION_OPTIONS.map((o) => ({
                value: o.value as RegionLayerMode,
                label: o.label,
              }))}
              onChange={(v) => setRegionLayer(v)}
            />
          </div>
        </div>
      </Section>

      {/* ④ 叠加组：宏观图层 */}
      <Section title="叠加图层" icon={<ClusterOutlined />}>
        <div className="space-y-1.5">
          {[
            { k: 'metro' as const, label: '地铁线路' },
            { k: 'districts' as const, label: '商圈分级' },
            { k: 'heatmap' as const, label: '人口热力' },
          ].map((it) => {
            const checked =
              it.k === 'metro' ? showMetro : it.k === 'districts' ? showDistricts : showHeatmap;
            return (
              <Checkbox
                key={it.k}
                checked={checked}
                onChange={() => togglePoi(it.k)}
              >
                <span className="text-sm">{it.label}</span>
              </Checkbox>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/** 小节标题 */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-ink-100">
      <div className="text-xs text-ink-500 mb-2 flex items-center gap-1 font-medium">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

/** 子字段标签（更紧凑） */
function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-ink-500 mb-1.5">{children}</div>;
}