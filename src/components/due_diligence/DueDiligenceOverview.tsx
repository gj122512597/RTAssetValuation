import { Card, Tag, Statistic, Row, Col, Progress, Button, Statistic as AStat } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '@/stores/assetStore';
import { getTemplateForType } from '@/mocks/due_diligence_templates';
import { useMemo } from 'react';

interface Props {
  asset: { id: string; type: string };
}

/**
 * 详情页"标准化尽调"概览（路线 A 改造）
 *  - 已有资产 = 默认"已尽调"（mock 数据自动填入）
 *  - 详情页只显示 4 项指标 + "去工作台补充"按钮
 *  - 完整 50 项尽调仅在工作台展开
 */
export default function DueDiligenceOverview({ asset }: Props) {
  const navigate = useNavigate();
  const dueDiligence = useAssetStore((s) => s.dueDiligence);

  // 已有资产：默认全部 pass
  const checks = useMemo(() => {
    if (dueDiligence[asset.id] && dueDiligence[asset.id].length > 0) {
      return dueDiligence[asset.id];
    }
    const tpl = getTemplateForType(asset.type);
    return tpl.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        id: item.id,
        category: cat.name,
        label: item.label,
        required: item.required,
        result: 'pass' as const,
        score: 7 + Math.random() * 3,
      }))
    );
  }, [dueDiligence, asset.id, asset.type]);

  const total = checks.length;
  const required = checks.filter((c) => c.required).length;
  const completed = checks.filter((c) => c.result !== 'pending').length;
  const completedRequired = checks.filter((c) => c.result !== 'pending' && c.required).length;
  const requiredDone = completedRequired === required;
  const score = (() => {
    let s = 0;
    let w = 0;
    for (const c of checks) {
      const v = c.result === 'pass' ? 1 : c.result === 'warn' ? 0.6 : c.result === 'fail' ? 0 : 0.5;
      s += v * (c.required ? 0.7 : 0.3);
      w += c.required ? 0.7 : 0.3;
    }
    return w > 0 ? Math.round((s / w) * 100) : 0;
  })();
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const riskColor = score >= 80 ? '#22c55e' : score >= 60 ? '#1f6feb' : '#f59e0b';
  const riskLabel = score >= 80 ? '低风险' : score >= 60 ? '中风险' : '高风险';

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>标准化尽调</span>
          <Tag color={requiredDone ? 'green' : 'orange'} bordered={false}>
            {requiredDone ? '已尽调' : '必检未完成'}
          </Tag>
          <Tag color={riskColor} bordered={false}>{riskLabel}</Tag>
        </div>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Button
          size="small"
          type="link"
          onClick={() => navigate('/due-diligence')}
        >
          打开工作台 ›
        </Button>
      }
    >
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">总分</span>}
            value={score}
            suffix="/100"
            valueStyle={{ fontSize: 18, color: riskColor }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">完成度</span>}
            value={completionPct}
            suffix="%"
            valueStyle={{ fontSize: 16, color: requiredDone ? '#22c55e' : '#1f6feb' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">必检项</span>}
            value={`${completedRequired} / ${required}`}
            valueStyle={{ fontSize: 16, color: requiredDone ? '#22c55e' : '#f59e0b' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">总项数</span>}
            value={total}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
      </Row>
      <Progress
        className="!mt-2"
        percent={completionPct}
        size="small"
        strokeColor={requiredDone ? '#22c55e' : '#1f6feb'}
        showInfo={false}
      />
      <div className="text-[11px] text-ink-500 leading-relaxed mt-2">
        已有资产默认视为"已尽调"（按 mock 数据回填）。完整 50 项检查仅在
        <span className="font-semibold text-ink-700 mx-1">尽调工作台</span>
        展示。新资产需走完整尽调流程后才能入库。
      </div>
    </Card>
  );
}