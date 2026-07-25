import { useMemo, useState } from 'react';
import {
  Card,
  Tag,
  Descriptions,
  Statistic,
  Row,
  Col,
  Progress,
  Empty,
  Alert,
  Tooltip,
  Collapse,
} from 'antd';
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
} from '@ant-design/icons';
import type { Asset } from '@/types';

/**
 * AI 建模特征卡（M2 升级：按 PRD §3/§4 把 10 组数据来源的结构化字段展示）
 *  - 默认展开"基础属性 + 区位特征 + 物理状态"，其余折叠
 *  - 每组带数据来源标识（ERP / GIS / 爬虫 / 人工 / OCR 等）
 *  - 评分类用 Progress；数值用 Statistic；类型用 Tag
 */
interface Props {
  asset: Asset;
}

const GROUP_META = [
  {
    key: 'basic',
    title: '基础属性',
    subtitle: '内部 ERP',
    icon: <ApartmentOutlined />,
    color: 'blue',
  },
  {
    key: 'location',
    title: '区位特征',
    subtitle: 'GIS + 地址 NLP',
    icon: <EnvironmentOutlined />,
    color: 'cyan',
  },
  {
    key: 'physical',
    title: '物理状态评分',
    subtitle: '图像识别 + 描述 NLP',
    icon: <CameraOutlined />,
    color: 'purple',
  },
  {
    key: 'trade',
    title: '历史交易',
    subtitle: '内部 ERP',
    icon: <HistoryOutlined />,
    color: 'gold',
  },
  {
    key: 'ocr',
    title: '评估公司报告 (OCR)',
    subtitle: 'OCR + NLP 抽取',
    icon: <FileSearchOutlined />,
    color: 'magenta',
  },
  {
    key: 'competitor',
    title: '竞品挂牌',
    subtitle: '爬虫：贝壳/58/房天下',
    icon: <GlobalOutlined />,
    color: 'geekblue',
  },
  {
    key: 'auction',
    title: '流拍记录',
    subtitle: '内部 ERP',
    icon: <AlertOutlined />,
    color: 'orange',
  },
  {
    key: 'survey',
    title: '人工调研',
    subtitle: '一线 App 录入',
    icon: <UserOutlined />,
    color: 'green',
  },
  {
    key: 'poi',
    title: 'POI 1km 内',
    subtitle: '宏观 GIS',
    icon: <ShopOutlined />,
    color: 'volcano',
  },
  {
    key: 'data_sources',
    title: '数据来源时间戳',
    subtitle: '各源最近同步',
    icon: <ClockCircleOutlined />,
    color: 'default',
  },
] as const;

const ScoreTag = ({ value, max = 10 }: { value: number; max?: number }) => {
  const pct = Math.round((value / max) * 100);
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <Progress
        percent={pct}
        size="small"
        strokeColor={color}
        style={{ flex: 1, minWidth: 80 }}
        format={(p) => (
          <span style={{ color, fontSize: 11 }}>{value.toFixed(1)}</span>
        )}
      />
    </div>
  );
};

export default function AiFeaturesCard({ asset }: Props) {
  const [activeKeys, setActiveKeys] = useState<string[]>([
    'basic',
    'location',
    'physical',
    'data_sources',
  ]);

  const f = useMemo(() => asset.ai_features, [asset.ai_features]);

  if (!f) {
    return (
      <Card title="AI 建模特征" size="small" className="!shadow-card">
        <Empty description="尚未补齐 AI 建模特征" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>AI 建模特征</span>
          <Tag color="purple" bordered={false}>
            XGBoost 输入
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
      {/* ★ AI 综合评分总览（业务升级：客户演示第一眼） */}
      <AiOverallScore f={f} />

      <Collapse
        size="small"
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        items={[
          {
            key: 'basic',
            label: (
              <GroupHeader
                icon={<ApartmentOutlined />}
                title="1. 基础属性"
                source="内部 ERP"
                color="blue"
                count={6}
              />
            ),
            children: (
              <Descriptions size="small" column={3} bordered>
                <Descriptions.Item label="竣工年份">{f.basic.completion_year}</Descriptions.Item>
                <Descriptions.Item label="建筑结构">
                  {f.basic.building_structure === 'frame'
                    ? '框架结构'
                    : f.basic.building_structure === 'brick'
                    ? '砖混结构'
                    : '混合结构'}
                </Descriptions.Item>
                <Descriptions.Item label="总楼层数">
                  {f.basic.above_ground_floors} 层
                </Descriptions.Item>
                <Descriptions.Item label="车位数">
                  {f.basic.parking_spaces}
                </Descriptions.Item>
                <Descriptions.Item label="电梯数">{f.basic.elevator_count}</Descriptions.Item>
                <Descriptions.Item label="占地面积">
                  {f.basic.land_area_sqm?.toLocaleString()} ㎡
                </Descriptions.Item>
              </Descriptions>
            ),
          },

          {
            key: 'location',
            label: (
              <GroupHeader
                icon={<EnvironmentOutlined />}
                title="2. 区位特征"
                source="GIS + 地址 NLP"
                color="cyan"
                count={8}
              />
            ),
            children: (
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="距 CBD">
                  <b>{f.location.distance_to_cbd_km.toFixed(1)} km</b>
                </Descriptions.Item>
                <Descriptions.Item label="距机场">
                  {f.location.distance_to_airport_km.toFixed(1)} km
                </Descriptions.Item>
                <Descriptions.Item label="学区评分">
                  <ScoreTag value={f.location.school_score} />
                </Descriptions.Item>
                <Descriptions.Item label="医疗资源">
                  <ScoreTag value={f.location.hospital_score} />
                </Descriptions.Item>
                <Descriptions.Item label="商业密度">
                  <ScoreTag value={f.location.commercial_density} />
                </Descriptions.Item>
                <Descriptions.Item label="商圈等级">
                  <Tag color={f.location.business_district_tier === 'A' ? 'red' : f.location.business_district_tier === 'B' ? 'orange' : 'default'}>
                    {f.location.business_district_tier} 级
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="周边写字楼">
                  {f.location.surrounding_tower_count} 栋
                </Descriptions.Item>
                <Descriptions.Item label="人口密度">
                  {f.location.population_density_pkm2.toLocaleString()} 人/km²
                </Descriptions.Item>
              </Descriptions>
            ),
          },

          {
            key: 'physical',
            label: (
              <GroupHeader
                icon={<CameraOutlined />}
                title="3. 物理状态评分"
                source="图像识别 + 描述 NLP"
                color="purple"
                count={9}
              />
            ),
            children: (
              <div className="space-y-3">
                <Descriptions size="small" column={2} bordered>
                  <Descriptions.Item label="外立面">
                    <ScoreTag value={f.physical.facade_score} />
                  </Descriptions.Item>
                  <Descriptions.Item label="结构质量">
                    <ScoreTag value={f.physical.structure_score} />
                  </Descriptions.Item>
                  <Descriptions.Item label="采光评分">
                    <ScoreTag value={f.physical.lighting_score} />
                  </Descriptions.Item>
                  <Descriptions.Item label="通风评分">
                    <ScoreTag value={f.physical.ventilation_score} />
                  </Descriptions.Item>
                  <Descriptions.Item label="现场噪音">
                    <Statistic
                      value={f.physical.noise_db}
                      suffix="dB"
                      valueStyle={{
                        fontSize: 14,
                        color: f.physical.noise_db > 65 ? '#ef4444' : '#22c55e',
                      }}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="日照小时">
                    {f.physical.sunlight_hours} h/天
                  </Descriptions.Item>
                </Descriptions>
                <Row gutter={12}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1.5">NLP 提取关键词</div>
                    <div className="flex flex-wrap gap-1">
                      {f.physical.nlp_keywords.map((kw, i) => (
                        <Tag key={i} bordered={false} color="default">
                          {kw}
                        </Tag>
                      ))}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1.5">NLP 风险提示</div>
                    <div className="flex flex-wrap gap-1">
                      {f.physical.nlp_risks.map((kw, i) => (
                        <Tag key={i} bordered={false} color="red">
                          ⚠ {kw}
                        </Tag>
                      ))}
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          },

          {
            key: 'trade',
            label: (
              <GroupHeader
                icon={<HistoryOutlined />}
                title="4. 历史交易"
                source="内部 ERP"
                color="gold"
                count={8}
              />
            ),
            children: (
              <Row gutter={[12, 12]}>
                <Col span={6}>
                  <Statistic
                    title="成交次数"
                    value={f.trade.trade_count}
                    valueStyle={{ fontSize: 18 }}
                    suffix="次"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="履约率"
                    value={f.trade.contract_completion_rate * 100}
                    suffix="%"
                    precision={0}
                    valueStyle={{ fontSize: 18, color: '#22c55e' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="逾期次数"
                    value={f.trade.overdue_count}
                    suffix="次"
                    valueStyle={{
                      fontSize: 18,
                      color: f.trade.overdue_count > 0 ? '#ef4444' : '#22c55e',
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均免租期"
                    value={f.trade.avg_free_rent_days}
                    suffix="天"
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
                <Col span={12}>
                  <div className="text-xs text-gray-500">最近成交</div>
                  <div className="text-sm">
                    {f.trade.last_trade_date ?? '—'}
                    {f.trade.last_trade_per_m2 && (
                      <Tag className="!ml-2" color="blue" bordered={false}>
                        ¥{f.trade.last_trade_per_m2}/㎡·天
                      </Tag>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-xs text-gray-500">累计成交额</div>
                  <div className="text-sm font-semibold">¥{(f.trade.total_volume_yuan / 1e8).toFixed(2)} 亿</div>
                </Col>
              </Row>
            ),
          },

          {
            key: 'ocr',
            label: (
              <GroupHeader
                icon={<FileSearchOutlined />}
                title="5. 评估公司报告"
                source="OCR + NLP 抽取"
                color="magenta"
                count={4}
              />
            ),
            children: (
              <div className="space-y-2">
                <Descriptions size="small" column={3} bordered>
                  <Descriptions.Item label="评估公司">
                    {f.ocr.last_valuation_company}
                  </Descriptions.Item>
                  <Descriptions.Item label="评估日期">
                    {f.ocr.last_valuation_date}
                  </Descriptions.Item>
                  <Descriptions.Item label="评估单价">
                    ¥{f.ocr.last_valuation_per_m2}/㎡·天
                  </Descriptions.Item>
                  <Descriptions.Item label="OCR 置信度" span={3}>
                    <div className="flex items-center gap-2">
                      <Progress
                        percent={f.ocr.confidence * 100}
                        size="small"
                        style={{ flex: 1 }}
                        strokeColor={f.ocr.confidence > 0.85 ? '#22c55e' : '#f59e0b'}
                      />
                      <span className="text-xs text-gray-500">
                        {(f.ocr.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </Descriptions.Item>
                </Descriptions>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      📎 PDF 已归档：<code className="text-xs">{f.ocr.pdf_url}</code>
                      <a
                        href={f.ocr.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-brand underline"
                      >
                        查看
                      </a>
                    </span>
                  }
                />
              </div>
            ),
          },

          {
            key: 'competitor',
            label: (
              <GroupHeader
                icon={<GlobalOutlined />}
                title="6. 竞品挂牌"
                source="爬虫：贝壳 / 58 / 房天下"
                color="geekblue"
                count={6}
              />
            ),
            children: (
              <Row gutter={[12, 12]}>
                <Col span={6}>
                  <Statistic
                    title="3km 内挂牌"
                    value={f.competitor.listings_3km}
                    suffix="套"
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="均价"
                    value={f.competitor.avg_listing_price}
                    suffix="元"
                    precision={1}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="最低 / 最高"
                    value={`¥${f.competitor.lowest_listing_price} / ¥${f.competitor.highest_listing_price}`}
                    valueStyle={{ fontSize: 12 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="议价空间"
                    value={f.competitor.avg_negotiation_strength * 100}
                    suffix="%"
                    precision={0}
                    valueStyle={{
                      fontSize: 18,
                      color:
                        f.competitor.avg_negotiation_strength > 0.2 ? '#ef4444' : '#22c55e',
                    }}
                  />
                </Col>
              </Row>
            ),
          },

          {
            key: 'auction',
            label: (
              <GroupHeader
                icon={<AlertOutlined />}
                title="7. 流拍记录"
                source="内部 ERP"
                color="orange"
                count={3}
              />
            ),
            children: (
              <Descriptions size="small" column={3} bordered>
                <Descriptions.Item label="流拍次数">
                  <b
                    className={
                      f.auction.failed_count === 0
                        ? 'text-green-500'
                        : f.auction.failed_count > 1
                        ? 'text-red-500'
                        : 'text-orange-500'
                    }
                  >
                    {f.auction.failed_count}
                  </b>
                </Descriptions.Item>
                <Descriptions.Item label="最近流拍">
                  {f.auction.last_failed_date ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="最低流拍价/评估价">
                  {f.auction.lowest_call_price_ratio === 0
                    ? '—'
                    : `${(f.auction.lowest_call_price_ratio * 100).toFixed(0)}%`}
                </Descriptions.Item>
              </Descriptions>
            ),
          },

          {
            key: 'survey',
            label: (
              <GroupHeader
                icon={<UserOutlined />}
                title="8. 人工调研"
                source="一线 App 录入"
                color="green"
                count={6}
              />
            ),
            children: (
              <div className="space-y-2">
                <Descriptions size="small" column={3} bordered>
                  <Descriptions.Item label="调研员">{f.survey.investigator}</Descriptions.Item>
                  <Descriptions.Item label="调研日期">{f.survey.survey_date}</Descriptions.Item>
                  <Descriptions.Item label="现场照片数">
                    {f.survey.site_photos_count} 张
                  </Descriptions.Item>
                  <Descriptions.Item label="人工修正系数" span={3}>
                    <Tag
                      color={
                        f.survey.manual_adjustment_coef > 1 ? 'red' : f.survey.manual_adjustment_coef < 0.95 ? 'orange' : 'green'
                      }
                    >
                      × {f.survey.manual_adjustment_coef.toFixed(2)}
                    </Tag>
                    <span className="text-xs text-gray-500 ml-2">
                      （最终估价 × 此 = 调后价）
                    </span>
                  </Descriptions.Item>
                </Descriptions>
                <div>
                  <div className="text-xs text-gray-500 mb-1">现场瑕疵</div>
                  <div className="flex flex-wrap gap-1">
                    {f.survey.defects.length === 0 ? (
                      <Tag color="green" bordered={false}>未发现明显瑕疵</Tag>
                    ) : (
                      f.survey.defects.map((d, i) => (
                        <Tag key={i} bordered={false} color="red">
                          ⚠ {d}
                        </Tag>
                      ))
                    )}
                  </div>
                </div>
                <Alert
                  type={f.survey.defects.length > 0 ? 'warning' : 'success'}
                  showIcon
                  message={`调整原因：${f.survey.adjustment_reason}`}
                />
              </div>
            ),
          },

          {
            key: 'poi',
            label: (
              <GroupHeader
                icon={<ShopOutlined />}
                title="9. POI 1km 内"
                source="宏观 GIS"
                color="volcano"
                count={6}
              />
            ),
            children: (
              <Row gutter={[12, 12]}>
                {[
                  { k: '地铁站', v: f.poi.metro_stations, color: '#2563eb' },
                  { k: '公交站', v: f.poi.bus_stops, color: '#22c55e' },
                  { k: '学校', v: f.poi.schools, color: '#f59e0b' },
                  { k: '医院', v: f.poi.hospitals, color: '#ef4444' },
                  { k: '商场', v: f.poi.shopping_malls, color: '#a855f7' },
                  { k: '公园', v: f.poi.parks, color: '#10b981' },
                ].map((it) => (
                  <Col span={8} key={it.k}>
                    <Card size="small" className="!shadow-none text-center" bordered>
                      <div className="text-xs text-gray-500">{it.k}</div>
                      <div className="text-2xl font-bold" style={{ color: it.color }}>
                        {it.v}
                      </div>
                      <div className="text-[10px] text-gray-400">个</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },

          {
            key: 'data_sources',
            label: (
              <GroupHeader
                icon={<ClockCircleOutlined />}
                title="10. 数据来源时间戳"
                source="各源最近同步"
                color="default"
                count={6}
              />
            ),
            children: (
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="内部 ERP">
                  {f.data_sources.erp_synced_at}
                </Descriptions.Item>
                <Descriptions.Item label="外部爬虫">
                  {f.data_sources.external_crawled_at}
                </Descriptions.Item>
                <Descriptions.Item label="OCR 抽取">
                  {f.data_sources.ocr_extracted_at}
                </Descriptions.Item>
                <Descriptions.Item label="现场调研">
                  {f.data_sources.survey_at}
                </Descriptions.Item>
                <Descriptions.Item label="NLP 抽取">
                  {f.data_sources.nlp_at}
                </Descriptions.Item>
                <Descriptions.Item label="POI 元数据">
                  {f.data_sources.poi_metadata_version}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
        ]}
      />
    </Card>
  );
}

function GroupHeader({
  icon,
  title,
  source,
  color,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  source: string;
  color: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color }}>{icon}</span>
      <span className="font-medium">{title}</span>
      <Tag color={color} bordered={false} className="!m-0">
        {source}
      </Tag>
      <span className="text-[10px] text-gray-400 ml-auto">{count} 个字段</span>
    </div>
  );
}

/**
 * AI 综合评分（业务升级 #P0-③）
 *  - 加权综合得分（0-100）+ 4 维雷达缩略图 + Top 3 风险点
 *  - 客户演示第一眼："AI 给这资产打 87 分"
 */
function AiOverallScore({ f }: { f: NonNullable<Asset['ai_features']> }) {
  // 综合得分 = 各维度加权（与 XGBoost importance 权重一致）
  const weights = {
    physical: 0.30, // 物理状态（成新/外立面/采光/通风）
    location: 0.30, // 区位
    trade: 0.15,    // 历史交易（履约率 + 成交数）
    ocr: 0.10,      // OCR 评估报告
    survey: 0.10,   // 人工调研
    poi: 0.05,      // POI
  };

  const physicalScore =
    (f.physical.facade_score + f.physical.structure_score + f.physical.lighting_score + f.physical.ventilation_score) /
    4;
  const locationScore =
    (f.location.school_score + f.location.hospital_score + f.location.commercial_density) / 3;
  const tradeScore = f.trade.contract_completion_rate * 10;
  const ocrScore = f.ocr.confidence * 10;
  const surveyScore =
    f.survey.manual_adjustment_coef * 10;
  const poiScore =
    (f.poi.metro_stations > 0 ? 8 : 4) + f.poi.shopping_malls * 0.5;

  const overall = Math.round(
    physicalScore * weights.physical +
    locationScore * weights.location +
    tradeScore * weights.trade +
    ocrScore * weights.ocr +
    surveyScore * weights.survey +
    poiScore * weights.poi
  );

  // Top 3 风险点（按风险分排序）
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
                    <Tag
                      color={r.level === 'high' ? 'red' : r.level === 'mid' ? 'orange' : 'gold'}
                      bordered={false}
                      className="!m-0"
                    >
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
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / 10) * 100}%`, background: color }}
        />
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
