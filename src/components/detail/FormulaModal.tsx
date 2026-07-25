import { Modal, Descriptions, Tag, Space, Alert, Divider, Table } from 'antd';
import type { Asset, PricingModel } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { PRICING_MODEL_LABELS, calcValuation, type ValuationInput } from '@/utils/pricingModels';
import { summarize } from '@/utils/shap';

interface FormulaModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  model: PricingModel;
  input: ValuationInput;
}

/**
 * 定价逻辑溯源弹窗（M2 P2-2）
 *  - 展示公式：Final = Base × Region × Physical × Equity × Decoration × FreeRent
 *  - 展示每个系数的取值来源（地铁距离 / 成新分 / 权证状态 / 装修 / 免租期）
 *  - 展示 SHAP-style 贡献表
 */
export default function FormulaModal({ open, onClose, asset, model, input }: FormulaModalProps) {
  const logic = useAssetStore((s) => s.valuationLogic);
  if (!logic) return null;

  const r = calcValuation(asset, logic, input, model);
  const summary = summarize(r.contributions);

  /** 防御：任何 model 的 factors 不一定都有同一组字段，统一用 ? 链 */
  const fmt = (v: unknown, n: number) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(n) : '—';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      title={
        <Space>
          <span>定价推导过程</span>
          <Tag color="blue" bordered={false}>{PRICING_MODEL_LABELS[model]}</Tag>
        </Space>
      }
      width={760}
      okText="已了解"
      cancelText="关闭"
    >
      <Alert
        showIcon
        type="info"
        className="!mb-3"
        message={
          <div>
            <div className="mb-1">
              当前使用 <b>{PRICING_MODEL_LABELS[model]}</b>，合规审计将记录该方法选择。
              最终：¥{r.final} /㎡·天，区间 ¥{r.rangeLow} ~ ¥{r.rangeHigh}。
            </div>
            <div className="text-[11px] text-gray-600 leading-relaxed">
              <b>推导方法</b>：{r.methodNote}
            </div>
          </div>
        }
      />

      <div className="bg-slate-50 rounded p-3 font-mono text-sm">
        <div>
          <b>Final</b> = <b>Base</b>({fmt(r.factors.base, 2)}) × <b>Region</b>({fmt(r.factors.regionCoef, 3)}){' '}
          × <b>Physical</b>({fmt(r.factors.physicalCoef, 3)}) × <b>Equity</b>({fmt(r.factors.equityCoef, 3)}){' '}
          × <b>Decoration</b>({fmt(r.factors.decorationCoef, 3)}) × <b>FreeRent</b>({fmt(r.factors.freeRentCoef, 3)})
        </div>
        <div className="mt-1 text-gray-700">
          = {fmt(r.factors.base, 2)} × {fmt(r.factors.regionCoef, 3)} ×{' '}
          {fmt(r.factors.physicalCoef, 3)} × {fmt(r.factors.equityCoef, 3)} ×{' '}
          {fmt(r.factors.decorationCoef, 3)} × {fmt(r.factors.freeRentCoef, 3)}
        </div>
        <Divider className="!my-2" />
        <div className="text-base">
          = <b className="text-brand">¥{r.final}</b> /㎡·天
        </div>
      </div>

      <Descriptions size="small" column={2} bordered className="!mt-3">
        <Descriptions.Item label="区位系数">{fmt(r.factors.regionCoef, 3)}</Descriptions.Item>
        <Descriptions.Item label="物理属性">{fmt(r.factors.physicalCoef, 3)}</Descriptions.Item>
        <Descriptions.Item label="权益状态">{fmt(r.factors.equityCoef, 3)}</Descriptions.Item>
        <Descriptions.Item label="装修系数">{fmt(r.factors.decorationCoef, 3)}</Descriptions.Item>
        <Descriptions.Item label="免租期系数">{fmt(r.factors.freeRentCoef, 3)}</Descriptions.Item>
        <Descriptions.Item label="最终估值">¥{r.final} /㎡·天</Descriptions.Item>
      </Descriptions>

      <div className="!mt-3">
        <div className="text-xs text-gray-500 mb-1.5">SHAP 贡献明细（特征 / 中文名 / 解释 / 来源）</div>
        <Table
          size="small"
          pagination={false}
          rowKey="feature"
          dataSource={summary.top}
          columns={[
            {
              title: '英文特征',
              dataIndex: 'feature',
              key: 'feature',
              width: 130,
              render: (v: string) => (
                <code className="text-[11px] text-gray-500 bg-slate-50 px-1.5 py-0.5 rounded">
                  {v}
                </code>
              ),
            },
            {
              title: '中文名称',
              dataIndex: 'feature_cn',
              key: 'feature_cn',
              width: 130,
              render: (v?: string) =>
                v ? <span className="font-medium text-gray-800">{v}</span> : '—',
            },
            {
              title: '贡献值（元）',
              dataIndex: 'contribution',
              key: 'contribution',
              align: 'right',
              width: 110,
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
            {
              title: '中文解释',
              dataIndex: 'explanation',
              key: 'explanation',
              render: (v?: string) =>
                v ? (
                  <span className="text-xs text-gray-600 leading-relaxed">{v}</span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                ),
            },
            {
              title: '取值来源',
              dataIndex: 'source',
              key: 'source',
              width: 320,
              render: (v: string) => (
                <code className="text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded break-all">
                  {v}
                </code>
              ),
            },
          ]}
        />
      </div>

      <Divider className="!my-3" />
      <div className="text-[11px] text-gray-400 leading-relaxed">
        推导规则：基础价（业态表）→ 区位/物理/权益/装修/免租期 多因子乘法叠加。
        每个因子的取值来源在此表"来源"列给出（如：地铁距离、成新分等），
        核价人员可直接审计任一项的合理性，并切换至其他"双方法交叉验证"模式。
      </div>
    </Modal>
  );
}
