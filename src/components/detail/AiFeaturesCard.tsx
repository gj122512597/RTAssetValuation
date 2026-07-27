import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Tag, Empty, Alert, Tooltip, Progress } from 'antd';
import {
  ApartmentOutlined,
  EnvironmentOutlined,
  CameraOutlined,
  HistoryOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  AlertOutlined,
  UserOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { Asset } from '@/types';
import { assetClassOf } from '@/utils/assetClass';

/**
 * AI 建模特征卡（重构版）
 *  - 去掉「全部塞进一个 Collapse 下拉」的反模式：所有分组默认平铺可见，
 *    核心分组（基础/区位/物理）整宽置顶，其余分组响应式两列网格。
 *  - 按资产类别（标品 / 非标）调整信息主次与排序：
 *      标品 → 模型可解释度高，优先展示区位/竞品/交易；
 *      非标 → 可比稀缺，优先展示人工调研/流拍/风险，并高亮人工修正系数。
 */
interface Props {
  asset: Asset;
}

/** 分组元信息（图标 / 标题 / 数据来源 / 主题色 / 字段数） */
const META: Record<
  string,
  { title: string; subtitle: string; icon: ReactNode; color: string; count: number }
> = {
  basic: { title: '基础属性', subtitle: '内部 ERP + 爬取', icon: <ApartmentOutlined />, color: 'blue', count: 13 },
  location: { title: '区位特征', subtitle: 'GIS + 地址 NLP', icon: <EnvironmentOutlined />, color: 'cyan', count: 11 },
  physical: { title: '物理状态', subtitle: '图像识别 + NLP', icon: <CameraOutlined />, color: 'purple', count: 9 },
  trade: { title: '历史交易', subtitle: '内部 ERP', icon: <HistoryOutlined />, color: 'gold', count: 8 },
  ocr: { title: '评估公司报告', subtitle: 'OCR + NLP', icon: <FileSearchOutlined />, color: 'magenta', count: 4 },
  competitor: { title: '竞品挂牌', subtitle: '爬虫：贝壳/58/房天下', icon: <GlobalOutlined />, color: 'geekblue', count: 6 },
  auction: { title: '流拍记录', subtitle: '内部 ERP', icon: <AlertOutlined />, color: 'orange', count: 3 },
  survey: { title: '人工调研', subtitle: '一线 App 录入', icon: <UserOutlined />, color: 'green', count: 6 },
  poi: { title: 'POI 1km 内', subtitle: '宏观 GIS', icon: <ShopOutlined />, color: 'volcano', count: 6 },
  data_sources: { title: '数据来源时间戳', subtitle: '各源最近同步', icon: <ClockCircleOutlined />, color: 'default', count: 6 },
  transaction_terms: { title: '交易条件', subtitle: '爬虫：58/安居客', icon: <FileProtectOutlined />, color: 'geekblue', count: 5 },
  temporal: { title: '时间特征', subtitle: '禧泰 + 挂牌月度', icon: <CalendarOutlined />, color: 'geekblue', count: 3 },
};

/** 标品/非标 各自的「核心分组（整宽置顶）」与「其余分组（两列网格）」顺序 */
const LAYOUT = {
  standard: {
    featured: ['basic', 'location', 'physical'],
    grid: ['poi', 'competitor', 'trade', 'ocr', 'transaction_terms', 'temporal', 'survey', 'auction', 'data_sources'],
    highlight: [] as string[],
  },
  non_standard: {
    featured: ['survey', 'auction', 'trade'],
    grid: ['physical', 'basic', 'location', 'transaction_terms', 'ocr', 'competitor', 'poi', 'temporal', 'data_sources'],
    highlight: ['survey', 'auction'],
  },
} as const;

const ScoreTag = ({ value, max = 10 }: { value: number; max?: number }) => {
  const pct = Math.round((value / max) * 100);
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <Progress
        percent={pct}
        size="small"
        strokeColor={color}
        style={{ flex: 1, minWidth: 70 }}
        format={(p) => <span style={{ color, fontSize: 11 }}>{value.toFixed(1)}</span>}
      />
    </div>
  );
};

/** hedonic 模型字段标记 */
const HedonicTag = () => (
  <Tag color="geekblue" bordered={false} style={{ fontSize: 9, marginLeft: 4, padding: '0 4px', lineHeight: '16px' }}>
    hedonic
  </Tag>
);

/** 紧凑字段行：左标签（可带 hedonic 标记），右值 */
function Field({ label, value, hedonic, strong }: { label: ReactNode; value: ReactNode; hedonic?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b border-ink-100 last:border-0">
      <span className="text-xs text-ink-500 shrink-0 flex items-center gap-0.5">
        {label}
        {hedonic && <HedonicTag />}
      </span>
      <span className={`text-sm text-ink-800 truncate text-right ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

/** 迷你统计块 */
function MiniStat({ title, value, suffix, color, small }: { title: string; value: ReactNode; suffix?: string; color?: string; small?: boolean }) {
  return (
    <div className="rounded-md bg-ink-50 px-2 py-1.5">
      <div className="text-[10px] text-ink-500">{title}</div>
      <div className={small ? 'text-xs font-bold mt-0.5' : 'text-base font-bold mt-0.5'} style={{ color: color ?? '#1f2937' }}>
        {value}
        {suffix && <span className="text-[10px] font-normal text-ink-400 ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

/** 分组卡片（始终展开，不再依赖下拉） */
function GroupCard({
  k,
  highlight,
  children,
}: {
  k: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  const m = META[k];
  return (
    <div className={`rounded-lg border bg-white p-3 ${highlight ? 'border-brand ring-1 ring-brand/30' : 'border-ink-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: m.color }}>{m.icon}</span>
        <span className="text-sm font-semibold text-ink-900">{m.title}</span>
        <Tag color={m.color} bordered={false} className="!m-0">
          {m.subtitle}
        </Tag>
        <span className="text-[10px] text-ink-300 ml-auto">{m.count} 字段</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function AiFeaturesCard({ asset }: Props) {
  const f = useMemo(() => asset.ai_features, [asset.ai_features]);

  if (!f) {
    return (
      <Card title="AI 建模特征" size="small" className="!shadow-card">
        <Empty description="尚未补齐 AI 建模特征" />
      </Card>
    );
  }

  const isNon = assetClassOf(asset) === 'non_standard';
  const layout = isNon ? LAYOUT.non_standard : LAYOUT.standard;
  const highlightSet = new Set(layout.highlight);

  /** 按分组 key 渲染该组字段内容 */
  const renderGroup = (k: string): ReactNode => {
    switch (k) {
      case 'basic':
        return (
          <>
            <Field label="竣工年份" value={f.basic.completion_year} />
            <Field
              label="建筑结构"
              value={f.basic.building_structure === 'frame' ? '框架结构' : f.basic.building_structure === 'brick' ? '砖混结构' : '混合结构'}
            />
            <Field label="总楼层数" value={`${f.basic.above_ground_floors} 层`} />
            <Field label="车位数" value={f.basic.parking_spaces} />
            <Field label="电梯数" value={f.basic.elevator_count} />
            <Field label="占地面积" value={`${f.basic.land_area_sqm?.toLocaleString()} ㎡`} />
            <Field label="面积 ln" hedonic value={f.basic.area_ln?.toFixed(2)} />
            <Field label="楼层信息" hedonic value={f.basic.floor_info} />
            <Field label="装修等级" hedonic value={f.basic.decoration_level} />
            <Field label="物业公司" hedonic value={f.basic.property_company} />
            <Field label="物业费" hedonic value={`¥${f.basic.property_fee_detail}/㎡·月`} />
            <Field label="得房率" hedonic value={`${f.basic.efficiency_rate}%`} />
            <Field label="朝向" hedonic value={f.basic.orientation} />
          </>
        );
      case 'location':
        return (
          <>
            <Field label="距 CBD" strong value={<b>{f.location.distance_to_cbd_km.toFixed(1)} km</b>} />
            <Field label="距机场" value={`${f.location.distance_to_airport_km.toFixed(1)} km`} />
            <Field label="学区评分" value={<ScoreTag value={f.location.school_score} />} />
            <Field label="医疗资源" value={<ScoreTag value={f.location.hospital_score} />} />
            <Field label="商业密度" value={<ScoreTag value={f.location.commercial_density} />} />
            <Field
              label="商圈等级"
              value={
                <Tag color={f.location.business_district_tier === 'A' ? 'red' : f.location.business_district_tier === 'B' ? 'orange' : 'default'}>
                  {f.location.business_district_tier} 级
                </Tag>
              }
            />
            <Field label="周边写字楼" value={`${f.location.surrounding_tower_count} 栋`} />
            <Field label="人口密度" value={`${f.location.population_density_pkm2.toLocaleString()} 人/km²`} />
            <Field label="商圈名称" hedonic value={f.location.business_district_name} />
            <Field label="楼盘名称" hedonic value={f.location.building_name} />
            <Field label="距地铁步行" hedonic value={`${f.location.distance_to_metro_m} m`} />
          </>
        );
      case 'physical':
        return (
          <>
            <Field label="外立面" value={<ScoreTag value={f.physical.facade_score} />} />
            <Field label="结构质量" value={<ScoreTag value={f.physical.structure_score} />} />
            <Field label="采光评分" value={<ScoreTag value={f.physical.lighting_score} />} />
            <Field label="通风评分" value={<ScoreTag value={f.physical.ventilation_score} />} />
            <Field
              label="现场噪音"
              value={
                <span style={{ color: f.physical.noise_db > 65 ? '#ef4444' : '#22c55e' }}>{f.physical.noise_db} dB</span>
              }
            />
            <Field label="日照小时" value={`${f.physical.sunlight_hours} h/天`} />
            <div className="mt-2">
              <div className="text-xs text-ink-500 mb-1">NLP 关键词</div>
              <div className="flex flex-wrap gap-1">
                {f.physical.nlp_keywords.map((kw, i) => (
                  <Tag key={i} bordered={false}>
                    {kw}
                  </Tag>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xs text-ink-500 mb-1">NLP 风险</div>
              <div className="flex flex-wrap gap-1">
                {f.physical.nlp_risks.map((kw, i) => (
                  <Tag key={i} bordered={false} color="red">
                    ⚠ {kw}
                  </Tag>
                ))}
              </div>
            </div>
          </>
        );
      case 'trade':
        return (
          <div className="grid grid-cols-2 gap-2">
            <MiniStat title="成交次数" value={f.trade.trade_count} suffix="次" />
            <MiniStat title="履约率" value={`${(f.trade.contract_completion_rate * 100).toFixed(0)}%`} color="#22c55e" />
            <MiniStat
              title="逾期次数"
              value={f.trade.overdue_count}
              suffix="次"
              color={f.trade.overdue_count > 0 ? '#ef4444' : '#22c55e'}
            />
            <MiniStat title="平均免租" value={f.trade.avg_free_rent_days} suffix="天" />
            <div className="col-span-2">
              <Field
                label="最近成交"
                value={
                  <>
                    {f.trade.last_trade_date ?? '—'}
                    {f.trade.last_trade_per_m2 && (
                      <Tag className="!ml-2" color="blue" bordered={false}>
                        ¥{f.trade.last_trade_per_m2}/㎡·天
                      </Tag>
                    )}
                  </>
                }
              />
            </div>
            <div className="col-span-2">
              <Field label="累计成交额" value={<span className="font-semibold">¥{(f.trade.total_volume_yuan / 1e8).toFixed(2)} 亿</span>} />
            </div>
          </div>
        );
      case 'ocr':
        return (
          <>
            <Field label="评估公司" value={f.ocr.last_valuation_company} />
            <Field label="评估日期" value={f.ocr.last_valuation_date} />
            <Field label="评估单价" value={`¥${f.ocr.last_valuation_per_m2}/㎡·天`} />
            <Field
              label="OCR 置信度"
              value={
                <div className="flex items-center gap-2">
                  <Progress
                    percent={f.ocr.confidence * 100}
                    size="small"
                    style={{ width: 90 }}
                    strokeColor={f.ocr.confidence > 0.85 ? '#22c55e' : '#f59e0b'}
                    format={() => `${(f.ocr.confidence * 100).toFixed(0)}%`}
                  />
                </div>
              }
            />
            <Alert
              type="info"
              showIcon
              className="!mt-2"
              message={
                <span>
                  📎 PDF 已归档：<code className="text-xs">{f.ocr.pdf_url}</code>{' '}
                  <a href={f.ocr.pdf_url} target="_blank" rel="noreferrer" className="ml-2 text-brand underline">
                    查看
                  </a>
                </span>
              }
            />
          </>
        );
      case 'competitor':
        return (
          <div className="grid grid-cols-2 gap-2">
            <MiniStat title="3km 内挂牌" value={f.competitor.listings_3km} suffix="套" />
            <MiniStat title="均价" value={f.competitor.avg_listing_price} suffix="元" />
            <MiniStat
              title="议价空间"
              value={`${(f.competitor.avg_negotiation_strength * 100).toFixed(0)}%`}
              color={f.competitor.avg_negotiation_strength > 0.2 ? '#ef4444' : '#22c55e'}
            />
            <MiniStat title="最低/最高价" value={`${f.competitor.lowest_listing_price}/${f.competitor.highest_listing_price}`} small />
          </div>
        );
      case 'auction':
        return (
          <>
            <Field
              label="流拍次数"
              value={
                <b className={f.auction.failed_count === 0 ? 'text-green-500' : f.auction.failed_count > 1 ? 'text-red-500' : 'text-orange-500'}>
                  {f.auction.failed_count}
                </b>
              }
            />
            <Field label="最近流拍" value={f.auction.last_failed_date ?? '—'} />
            <Field
              label="最低流拍价/评估价"
              value={f.auction.lowest_call_price_ratio === 0 ? '—' : `${(f.auction.lowest_call_price_ratio * 100).toFixed(0)}%`}
            />
          </>
        );
      case 'survey':
        return (
          <>
            <Field label="调研员" value={f.survey.investigator} />
            <Field label="调研日期" value={f.survey.survey_date} />
            <Field label="现场照片数" value={`${f.survey.site_photos_count} 张`} />
            <Field
              label="人工修正系数"
              value={
                <Tag color={f.survey.manual_adjustment_coef > 1 ? 'red' : f.survey.manual_adjustment_coef < 0.95 ? 'orange' : 'green'}>
                  × {f.survey.manual_adjustment_coef.toFixed(2)}
                </Tag>
              }
            />
            <div className="mt-2">
              <div className="text-xs text-ink-500 mb-1">现场瑕疵</div>
              <div className="flex flex-wrap gap-1">
                {f.survey.defects.length === 0 ? (
                  <Tag color="green" bordered={false}>
                    未发现明显瑕疵
                  </Tag>
                ) : (
                  f.survey.defects.map((d, i) => (
                    <Tag key={i} bordered={false} color="red">
                      ⚠ {d}
                    </Tag>
                  ))
                )}
              </div>
            </div>
            <Alert type={f.survey.defects.length > 0 ? 'warning' : 'success'} showIcon className="!mt-2" message={`调整原因：${f.survey.adjustment_reason}`} />
          </>
        );
      case 'poi':
        return (
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: '地铁站', v: f.poi.metro_stations, color: '#2563eb' },
              { k: '公交站', v: f.poi.bus_stops, color: '#22c55e' },
              { k: '学校', v: f.poi.schools, color: '#f59e0b' },
              { k: '医院', v: f.poi.hospitals, color: '#ef4444' },
              { k: '商场', v: f.poi.shopping_malls, color: '#a855f7' },
              { k: '公园', v: f.poi.parks, color: '#10b981' },
            ].map((it) => (
              <div key={it.k} className="rounded-md bg-ink-50 text-center py-2">
                <div className="text-[10px] text-ink-500">{it.k}</div>
                <div className="text-xl font-bold" style={{ color: it.color }}>
                  {it.v}
                </div>
                <div className="text-[9px] text-ink-400">个</div>
              </div>
            ))}
          </div>
        );
      case 'data_sources':
        return (
          <>
            <Field label="内部 ERP" value={f.data_sources.erp_synced_at} />
            <Field label="外部爬虫" value={f.data_sources.external_crawled_at} />
            <Field label="OCR 抽取" value={f.data_sources.ocr_extracted_at} />
            <Field label="现场调研" value={f.data_sources.survey_at} />
            <Field label="NLP 抽取" value={f.data_sources.nlp_at} />
            <Field label="POI 版本" value={f.data_sources.poi_metadata_version} />
          </>
        );
      case 'transaction_terms':
        return (
          <>
            <Field
              label="含发票"
              hedonic
              value={f.transaction_terms ? <Tag color={f.transaction_terms.includes_invoice ? 'green' : 'default'} bordered={false}>{f.transaction_terms.includes_invoice ? '是' : '否'}</Tag> : '—'}
            />
            <Field
              label="含物业费"
              hedonic
              value={f.transaction_terms ? <Tag color={f.transaction_terms.includes_property_fee ? 'green' : 'default'} bordered={false}>{f.transaction_terms.includes_property_fee ? '是' : '否'}</Tag> : '—'}
            />
            <Field
              label="带家具"
              hedonic
              value={f.transaction_terms ? <Tag color={f.transaction_terms.includes_furniture ? 'green' : 'default'} bordered={false}>{f.transaction_terms.includes_furniture ? '是' : '否'}</Tag> : '—'}
            />
            <Field
              label="可注册"
              hedonic
              value={f.transaction_terms ? <Tag color={f.transaction_terms.can_register ? 'green' : 'red'} bordered={false}>{f.transaction_terms.can_register ? '是' : '否'}</Tag> : '—'}
            />
            <Field
              label="24h 空调"
              hedonic
              value={f.transaction_terms ? <Tag color={f.transaction_terms.has_24h_ac ? 'green' : 'default'} bordered={false}>{f.transaction_terms.has_24h_ac ? '是' : '否'}</Tag> : '—'}
            />
          </>
        );
      case 'temporal':
        return (
          <>
            <Field label="挂牌月份" hedonic value={f.temporal?.listing_month ?? '—'} />
            <Field label="月度租金指数" hedonic value={f.temporal?.rent_price_index ?? '—'} />
            <Field label="售租比" hedonic value={f.temporal?.price_rent_ratio ?? '—'} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span>AI 建模特征</span>
          <Tag color="purple" bordered={false}>
            Hedonic 输入
          </Tag>
          <Tag color={isNon ? 'orange' : 'green'} bordered={false}>
            {isNon ? '非标资产' : '标准资产'}
          </Tag>
          <span className="text-xs text-gray-400 font-normal">PRD §3/§4</span>
        </div>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Tooltip title="每条数据均带数据来源标识，可被模型的 SHAP/LIME 解释">
          <Tag color="default" bordered={false}>
            ⓘ 字段溯源
          </Tag>
        </Tooltip>
      }
    >
      {/* 类别横幅：标品 / 非标 不同引导 */}
      <Alert
        className="!mb-3"
        showIcon
        type={isNon ? 'warning' : 'success'}
        message={isNon ? '非标资产 · 可比实例稀缺' : '标准资产 · 模型可解释度高'}
        description={
          isNon
            ? `估价以参考区间为准，建议人工复核。当前人工修正系数 ×${f.survey.manual_adjustment_coef.toFixed(2)}。`
            : '周边可比数据充足，Hedonic 特征价格法可直接给出可解释定价。'
        }
      />

      {/* AI 综合评分总览 */}
      <AiOverallScore f={f} />

      {/* 核心分组：整宽置顶 */}
      <div className="space-y-3">
        {layout.featured.map((k) => (
          <GroupCard key={k} k={k} highlight={highlightSet.has(k)}>
            {renderGroup(k)}
          </GroupCard>
        ))}
      </div>

      {/* 其余分组：响应式两列网格 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        {layout.grid.map((k) => (
          <GroupCard key={k} k={k} highlight={highlightSet.has(k)}>
            {renderGroup(k)}
          </GroupCard>
        ))}
      </div>
    </Card>
  );
}

/**
 * AI 综合评分（业务升级 #P0-③）
 *  - 加权综合得分（0-100）+ 4 维雷达缩略图 + Top 3 风险点
 */
function AiOverallScore({ f }: { f: NonNullable<Asset['ai_features']> }) {
  const weights = {
    physical: 0.3,
    location: 0.3,
    trade: 0.15,
    ocr: 0.1,
    survey: 0.1,
    poi: 0.05,
  };

  const physicalScore =
    (f.physical.facade_score + f.physical.structure_score + f.physical.lighting_score + f.physical.ventilation_score) / 4;
  const locationScore = (f.location.school_score + f.location.hospital_score + f.location.commercial_density) / 3;
  const tradeScore = f.trade.contract_completion_rate * 10;
  const ocrScore = f.ocr.confidence * 10;
  const surveyScore = f.survey.manual_adjustment_coef * 10;
  const poiScore = (f.poi.metro_stations > 0 ? 8 : 4) + f.poi.shopping_malls * 0.5;

  const overall = Math.round(
    physicalScore * weights.physical +
      locationScore * weights.location +
      tradeScore * weights.trade +
      ocrScore * weights.ocr +
      surveyScore * weights.survey +
      poiScore * weights.poi
  );

  const risks: { label: string; reason: string; level: 'high' | 'mid' | 'low' }[] = [];
  if (f.physical.facade_score < 5) risks.push({ label: '外立面老化', reason: `评分仅 ${f.physical.facade_score}/10`, level: 'high' });
  if (f.physical.structure_score < 5) risks.push({ label: '结构隐患', reason: `评分 ${f.physical.structure_score}/10`, level: 'high' });
  if (f.physical.noise_db > 65) risks.push({ label: '噪音超标', reason: `${f.physical.noise_db}dB（>65dB）`, level: 'mid' });
  if (f.location.distance_to_cbd_km > 15) risks.push({ label: '区位偏远', reason: `距 CBD ${f.location.distance_to_cbd_km}km`, level: 'mid' });
  if (f.physical.sunlight_hours < 3) risks.push({ label: '采光不足', reason: `${f.physical.sunlight_hours}h/天`, level: 'low' });
  if (f.trade.overdue_count > 0) risks.push({ label: '历史逾期', reason: `${f.trade.overdue_count} 次`, level: 'mid' });
  if (f.ocr.confidence < 0.8) risks.push({ label: 'OCR 置信度低', reason: `${(f.ocr.confidence * 100).toFixed(0)}%`, level: 'low' });
  const top3 = risks.slice(0, 3);

  const overallColor = overall >= 80 ? '#22c55e' : overall >= 60 ? '#1f6feb' : overall >= 40 ? '#f59e0b' : '#ef4444';
  const levelLabel = overall >= 80 ? '优' : overall >= 60 ? '良' : overall >= 40 ? '中' : '差';

  return (
    <div className="mb-3 p-3 rounded-md border-2 border-dashed" style={{ borderColor: overallColor, background: `${overallColor}08` }}>
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[90px]">
          <div className="text-[10px] text-ink-500 mb-0.5">AI 综合评分</div>
          <div className="text-3xl font-bold" style={{ color: overallColor }}>
            {overall}
          </div>
          <div className="text-[10px] font-semibold" style={{ color: overallColor }}>
            / 100 · {levelLabel}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-ink-500 mb-0.5">各维度得分</div>
            <div className="space-y-0.5">
              <DimRow label="物理" value={physicalScore} weight={weights.physical} />
              <DimRow label="区位" value={locationScore} weight={weights.location} />
              <DimRow label="交易" value={tradeScore} weight={weights.trade} />
              <DimRow label="OCR" value={ocrScore} weight={weights.ocr} />
              <DimRow label="调研" value={surveyScore} weight={weights.survey} />
            </div>
          </div>
          <div>
            <div className="text-ink-500 mb-0.5">Top 3 风险点</div>
            {top3.length === 0 ? (
              <div className="text-success">✓ 未识别到显著风险</div>
            ) : (
              <div className="space-y-0.5">
                {top3.map((r) => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <Tag color={r.level === 'high' ? 'red' : r.level === 'mid' ? 'orange' : 'gold'} bordered={false} className="!m-0">
                      {r.level === 'high' ? '高' : r.level === 'mid' ? '中' : '低'}
                    </Tag>
                    <span className="text-ink-700">{r.label}</span>
                    <span className="text-ink-500 text-[10px]">· {r.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DimRow({ label, value, weight }: { label: string; value: number; weight: number }) {
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-ink-500">{label}</span>
      <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, background: color }} />
      </div>
      <span className="w-7 text-right font-mono font-semibold" style={{ color, fontSize: 10 }}>
        {value.toFixed(1)}
      </span>
      <span className="w-7 text-right text-ink-300" style={{ fontSize: 9 }}>
        ×{(weight * 100).toFixed(0)}%
      </span>
    </div>
  );
}
