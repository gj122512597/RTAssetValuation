import { Card, Progress, Tag, Space, Alert } from 'antd';
import { useMemo } from 'react';
import type { Asset, PricingModel } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { buildComplianceReport } from '@/utils/report';
import { calcValuation, type ValuationInput } from '@/utils/pricingModels';

/**
 * 合规评分条（M3 P4-2）
 *   集成到详情页，作为生成报告前的快速评分卡
 */
interface Props {
  asset: Asset;
  input: ValuationInput;
  model: PricingModel;
}

export default function ComplianceStrip({ asset, input, model }: Props) {
  const logic = useAssetStore((s) => s.valuationLogic);
  const competitors = useAssetStore((s) => s.competitors);
  const radius = useAssetStore((s) => s.compRadiusKm);
  const modelsUsed = useAssetStore((s) => s.pricingModelsUsed);

  const compliance = useMemo(() => {
    if (!logic) return null;
    const v = calcValuation(asset, logic, input, model);
    return buildComplianceReport(
      {
        asset,
        valuation: v,
        input,
        model,
        competitors,
        radiusKm: radius,
        preparedBy: 'system',
        attachments: ['现场照片', '物业证', '评估公司报告'],
      },
      modelsUsed
    );
  }, [asset, logic, input, model, competitors, radius, modelsUsed]);

  if (!compliance) return null;

  const pass = compliance.items.filter((i) => i.passed).length;
  const total = compliance.items.length;

  return (
    <Card
      title={
        <Space>
          <span>合规性审查</span>
          <Tag color={compliance.level === 'unqualified' ? 'red' : 'blue'} bordered={false}>
            {compliance.score} / 100
          </Tag>
        </Space>
      }
     
      className="!shadow-card"
    >
      <Progress
        percent={compliance.score}
       
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

      <div className="text-xs text-gray-500 mt-1">
        通过 {pass} / {total} 项 · 已使用 {compliance.modelsUsed.length} 种方法交叉验证
      </div>

      {compliance.level === 'risk' && (
        <Alert
          className="!mt-2"
          type="warning"
          showIcon
         
          message="合规评分偏低，建议补齐附件或人工修正后再提交"
        />
      )}
      {compliance.level === 'unqualified' && (
        <Alert
          className="!mt-2"
          type="error"
          showIcon
          message="报告不合格，请勿提交核价"
        />
      )}
    </Card>
  );
}
