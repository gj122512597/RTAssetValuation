import { Card, Tag, Descriptions, Table, Progress, Empty, Divider, Alert, Steps } from 'antd';
import { useMemo } from 'react';
import type { Asset, PricingModel, Competitor } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { calcValuation, PRICING_MODEL_LABELS, type ValuationInput } from '@/utils/pricingModels';
import { pickCompsInRadius } from '@/utils/shap';
import HiddenRiskTag, { RISK_LABELS } from '@/components/common/HiddenRiskTag';
import { buildComplianceReport } from '@/utils/report';

interface Props {
  asset: Asset;
  input: ValuationInput;
  model: PricingModel;
}

/**
 * 报告预览（M3 P4-1）
 *  - 单页 HTML 渲染《租金评估建议书》
 *  - 包含：封面、摘要、画像、估值明细、SHAP 推导、竞品对标、风险标签、合规审查、附件清单
 *  - 上层通过 window.print() 输出 PDF（浏览器原生）
 */
export default function ReportPreview({ asset, input, model }: Props) {
  const logic = useAssetStore((s) => s.valuationLogic);
  const competitors = useAssetStore((s) => s.competitors);
  const radius = useAssetStore((s) => s.compRadiusKm);
  const modelsUsed = useAssetStore((s) => s.pricingModelsUsed);
  const preparedBy = useAssetStore((s) => s.currentUser.name);

  const result = useMemo(
    () => (logic ? calcValuation(asset, logic, input, model) : null),
    [asset, logic, input, model]
  );

  const comps = useMemo(
    () => pickCompsInRadius(asset, competitors, radius),
    [asset, competitors, radius]
  );

  const compliance = useMemo(
    () =>
      result
        ? buildComplianceReport(
            {
              asset,
              valuation: result,
              input,
              model,
              competitors,
              radiusKm: radius,
              preparedBy,
              attachments: [
                '现场照片',
                '物业证扫描件',
                '评估公司报告',
                '租数系统历史成交',
              ],
            },
            modelsUsed
          )
        : null,
    [result, asset, input, model, competitors, radius, modelsUsed, preparedBy]
  );

  if (!logic || !result || !compliance) {
    return (
      <Empty description="估值逻辑加载中…" />
    );
  }

  const att = ['现场照片', '物业证扫描件', '评估公司报告', '租数系统历史成交'];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          《租金评估建议书》 · {asset.name}
          <Tag color="blue">{PRICING_MODEL_LABELS[model]}</Tag>
          <Tag color="purple" bordered={false}>合规 {compliance.score}</Tag>
        </span>
      }
      size="small"
      className="!shadow-card"
      id="report-content"
    >
      {/* 顶部进度条（业务升级：长报告导航） */}
      <div className="bg-gradient-to-r from-brand-50 to-slate-50 rounded-md p-2.5 mb-3">
        <Steps
          size="small"
          current={1}
          items={[
            { title: '摘要' },
            { title: '画像' },
            { title: '估值' },
            { title: 'SHAP' },
            { title: '竞品' },
            { title: '合规' },
          ]}
        />
      </div>

      {/* 1. 封面 + 摘要 */}
      <section className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-base font-semibold mb-1">{asset.name}</div>
            <div className="text-xs text-gray-500">
              编号 {asset.id} · {asset.region} · {asset.address}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">报告生成时间</div>
            <div className="text-sm">{new Date().toLocaleString('zh-CN')}</div>
            <div className="text-xs text-gray-400 mt-1">编制：{preparedBy}</div>
          </div>
        </div>
      </section>

      <Descriptions size="small" column={3} bordered className="!mb-3">
        <Descriptions.Item label="业态">{asset.type}</Descriptions.Item>
        <Descriptions.Item label="面积">{asset.area.toLocaleString()} ㎡</Descriptions.Item>
        <Descriptions.Item label="状态">{asset.status}</Descriptions.Item>
        <Descriptions.Item label="装修">{asset.decoration_level}</Descriptions.Item>
        <Descriptions.Item label="距地铁">
          {asset.features.subway_distance > 5000 ? '>5 km' : `${asset.features.subway_distance} m`}
        </Descriptions.Item>
        <Descriptions.Item label="成新">{asset.features.condition_score}/10</Descriptions.Item>
      </Descriptions>

      {/* 2. 估值结果 */}
      <section className="mb-3">
        <div className="text-sm font-semibold mb-1.5">一、估值结论</div>
        <Alert
          type="info"
          showIcon
          className="!mb-2"
          message={
            <span>
              本报告使用 <b>{PRICING_MODEL_LABELS[model]}</b>作为主方法，交叉参考：{' '}
              <b>{modelsUsed.map((m) => PRICING_MODEL_LABELS[m]).join(' / ')}</b> 进行交叉验证。
            </span>
          }
        />
        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="建议区间下限">¥{result.rangeLow}</Descriptions.Item>
          <Descriptions.Item label="中心估值">¥{result.final}</Descriptions.Item>
          <Descriptions.Item label="建议区间上限">¥{result.rangeHigh}</Descriptions.Item>
          <Descriptions.Item label="置信度">
            {(result.confidence * 100).toFixed(0)}%
          </Descriptions.Item>
          <Descriptions.Item label="不确定度">
            {(result.uncertainty * 100).toFixed(0)}%
          </Descriptions.Item>
          <Descriptions.Item label="月租潜力">
            ¥{((result.final * asset.area * 30) / 1e4).toFixed(1)} 万
          </Descriptions.Item>
        </Descriptions>
      </section>

      <Divider className="!my-2" />

      {/* 3. SHAP 推导 */}
      <section className="mb-3">
        <div className="text-sm font-semibold mb-1.5">二、定价推导（SHAP 贡献）</div>
        <Table
          size="small"
          pagination={false}
          rowKey="feature"
          dataSource={result.contributions}
          columns={[
            { title: '特征', dataIndex: 'feature', key: 'feature' },
            {
              title: '贡献（元）',
              dataIndex: 'contribution',
              key: 'contribution',
              align: 'right',
              render: (_v, record) => {
                const v = Number(record.contribution ?? 0);
                const sign = v > 0 ? '+' : '';
                return (
                  <span className={v > 0 ? 'text-green-600' : 'text-red-500'}>
                    {sign}
                    {Number.isFinite(v) ? v.toFixed(3) : '—'}
                  </span>
                );
              },
            },
            { title: '取值来源', dataIndex: 'source', key: 'source' },
          ]}
        />
      </section>

      <Divider className="!my-2" />

      {/* 4. 竞品对标 */}
      <section className="mb-3">
        <div className="text-sm font-semibold mb-1.5">三、{radius}km 内竞品</div>
        {comps.length === 0 ? (
          <Empty description="无竞品" />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={comps}
            columns={[
              { title: '楼盘', dataIndex: 'name', key: 'name' },
              { title: '类型', dataIndex: 'id', key: 'type', render: () => asset.type },
              {
                title: '挂牌价',
                dataIndex: 'list_price',
                key: 'list_price',
                render: (_v, record) =>
                  `¥${Number(record.list_price ?? 0)}/㎡·天`,
              },
              {
                title: '出租率',
                dataIndex: 'occupancy_rate',
                key: 'occupancy_rate',
                render: (_v, record) =>
                  `${(Number(record.occupancy_rate ?? 0) * 100).toFixed(0)}%`,
              },
            ]}
          />
        )}
      </section>

      <Divider className="!my-2" />

      {/* 5. 风险标签 */}
      <section className="mb-3">
        <div className="text-sm font-semibold mb-1.5">四、隐性风险披露</div>
        <div className="flex flex-wrap gap-1.5">
          {asset.hidden_risks && asset.hidden_risks.length > 0 ? (
            asset.hidden_risks.map((r) => <HiddenRiskTag key={r} tag={r} />)
          ) : (
            <Tag color="green" bordered={false}>未发现隐性风险</Tag>
          )}
        </div>
      </section>

      <Divider className="!my-2" />

      {/* 6. 合规审查 */}
      <section className="mb-3">
        <div className="text-sm font-semibold mb-1.5">五、合规性审查</div>
        <div className="flex items-center gap-3 mb-2">
          <Progress
            percent={compliance.score}
            size="small"
            style={{ flex: 1 }}
            strokeColor={
              compliance.level === 'excellent'
                ? '#22c55e'
                : compliance.level === 'good'
                ? '#1f6feb'
                : compliance.level === 'risk'
                ? '#f59e0b'
                : '#ef4444'
            }
          />
          <Tag
            color={
              compliance.level === 'excellent'
                ? 'green'
                : compliance.level === 'good'
                ? 'blue'
                : compliance.level === 'risk'
                ? 'orange'
                : 'red'
            }
          >
            {compliance.level === 'excellent' ? '优秀' :
              compliance.level === 'good' ? '合格' :
              compliance.level === 'risk' ? '风险' : '不合格'}
          </Tag>
        </div>
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={compliance.items}
          columns={[
            {
              title: '检查项',
              dataIndex: 'label',
              key: 'label',
              render: (t: string) => (
                <span className="text-xs">
                  {t}
                  {RISK_LABELS && false && null /* 占位 */}
                </span>
              ),
            },
            {
              title: '结果',
              dataIndex: 'passed',
              key: 'passed',
              width: 80,
              render: (b: boolean) => (b ? <Tag color="green" bordered={false}>通过</Tag> : <Tag color="red" bordered={false}>不通过</Tag>),
            },
            { title: '详情', dataIndex: 'detail', key: 'detail', width: 320 },
          ]}
        />
      </section>

      <Divider className="!my-2" />

      {/* 7. 附件 */}
      <section>
        <div className="text-sm font-semibold mb-1.5">六、附件清单</div>
        <div className="flex flex-wrap gap-1.5">
          {att.map((a) => (
            <Tag key={a} color="default" bordered={false}>
              📎 {a}
            </Tag>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-gray-400 text-right">
          编制说明：本报告由XX地产·租金地图评估系统（M3 版本）自动生成，请核价人员复核签字后归档。
        </div>
      </section>
    </Card>
  );
}
