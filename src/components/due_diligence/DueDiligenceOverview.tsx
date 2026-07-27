import { Card, Tag, Statistic, Row, Col, Button } from 'antd';
import { FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '@/stores/assetStore';
import { getTemplateForType } from '@/mocks/due_diligence_templates';
import { useMemo } from 'react';

interface Props {
  asset: { id: string; type: string };
}

/**
 * 详情页"标准化尽调"概览 v2（review 后简化）
 *  - 已有资产默认视为"已尽调"（按 mock 自动填入）
 *  - 只显示 2 个核心指标：总分 + 必检
 *  - 风险等级 + "去工作台"按钮
 */
export default function DueDiligenceOverview({ asset }: Props) {
  const navigate = useNavigate();
  const dueDiligence = useAssetStore((s) => s.dueDiligence);

  const stats = useMemo(() => {
    let checks = dueDiligence[asset.id];
    if (!checks || checks.length === 0) {
      const tpl = getTemplateForType(asset.type);
      checks = tpl.categories.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          category: cat.name,
          label: item.label,
          required: item.required,
          result: 'pass' as const,
          score: 7 + Math.random() * 3,
        }))
      );
    }
    const required = checks.filter((c) => c.required).length;
    const completedRequired = checks.filter(
      (c) => c.result !== 'pending' && c.required
    ).length;
    const requiredDone = completedRequired === required;
    let s = 0;
    let w = 0;
    for (const c of checks) {
      const v = c.result === 'pass' ? 1 : c.result === 'warn' ? 0.6 : c.result === 'fail' ? 0 : 0.5;
      s += v * (c.required ? 0.7 : 0.3);
      w += c.required ? 0.7 : 0.3;
    }
    const score = w > 0 ? Math.round((s / w) * 100) : 0;
    return { score, requiredDone, required, completedRequired };
  }, [dueDiligence, asset.id, asset.type]);

  const riskColor = stats.score >= 80 ? '#22c55e' : stats.score >= 60 ? '#1f6feb' : '#f59e0b';
  const riskLabel = stats.score >= 80 ? '低风险' : stats.score >= 60 ? '中风险' : '高风险';

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>标准化尽调</span>
          <Tag color={stats.requiredDone ? 'green' : 'orange'} bordered={false}>
            {stats.requiredDone ? '已尽调' : '必检未完成'}
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
          icon={<ArrowRightOutlined />}
          onClick={() => navigate('/due-diligence')}
        >
          打开工作台
        </Button>
      }
    >
      <Row gutter={24}>
        <Col span={12}>
          <Statistic
            title={<span className="text-xs">尽调总分</span>}
            value={stats.score}
            suffix="/100"
            valueStyle={{ fontSize: 22, color: riskColor, fontWeight: 600 }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={<span className="text-xs">必检完成度</span>}
            value={`${stats.completedRequired} / ${stats.required}`}
            valueStyle={{
              fontSize: 18,
              color: stats.requiredDone ? '#22c55e' : '#f59e0b',
            }}
          />
        </Col>
      </Row>
      <div className="text-[11px] text-ink-500 leading-relaxed mt-2">
        已有资产默认视为"已尽调"。完整 50 项检查仅在
        <span className="font-semibold text-ink-700 mx-1">尽调工作台</span>
        展开。
      </div>
    </Card>
  );
}