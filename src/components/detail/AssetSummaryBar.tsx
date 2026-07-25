import { useMemo } from 'react';
import { Tag, Tooltip, Space, Statistic, Progress } from 'antd';
import {
  EnvironmentOutlined,
  RiseOutlined,
  WarningOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { Asset } from '@/types';

/**
 * 详情页 Sticky 顶部摘要条
 *  - 滚到 AI 特征 / 历史 / 破冰 时也能一眼看到核心
 *  - 4 个关键指标 + 风险徽章
 */
interface Props {
  asset: Asset;
}

const STATUS_TAG: Record<Asset['status'], { label: string; color: string }> = {
  vacant: { label: '空置', color: 'red' },
  leased: { label: '在租', color: 'green' },
  renovating: { label: '改造中', color: 'orange' },
};

export default function AssetSummaryBar({ asset }: Props) {
  const riskScore = useMemo(() => {
    if (!asset.ai_features) return 0;
    const f = asset.ai_features.physical;
    return Math.round(
      100 -
        (f.facade_score + f.structure_score + f.lighting_score + f.ventilation_score) /
          4 *
          10
    );
  }, [asset]);

  const riskLevel = riskScore > 60 ? 'high' : riskScore > 30 ? 'mid' : 'low';
  const riskColor = riskLevel === 'high' ? '#ef4444' : riskLevel === 'mid' ? '#f59e0b' : '#22c55e';

  return (
    <div
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-ink-100 shadow-card px-6 py-2.5 flex items-center gap-6"
    >
      <Statistic
        title={<span className="text-xs">估价</span>}
        value={asset.estimated_price}
        precision={2}
        suffix={<span className="text-xs text-ink-500">元/㎡·天</span>}
        valueStyle={{ fontSize: 18, color: '#1f6feb' }}
      />

      <Statistic
        title={<span className="text-xs">置信度</span>}
        value={(asset.confidence * 100).toFixed(0)}
        suffix="%"
        valueStyle={{
          fontSize: 18,
          color: asset.confidence > 0.7 ? '#22c55e' : asset.confidence > 0.5 ? '#f59e0b' : '#ef4444',
        }}
      />

      <div>
        <div className="text-xs text-ink-500 mb-0.5">状态</div>
        <Tag color={STATUS_TAG[asset.status].color} bordered={false} className="!m-0">
          {STATUS_TAG[asset.status].label}
        </Tag>
      </div>

      <div className="min-w-[140px]">
        <div className="text-xs text-ink-500 mb-0.5 flex items-center gap-1">
          <WarningOutlined /> 风险等级
        </div>
        <Tooltip title="基于成新/外立面/采光/通风加权">
          <Progress
            percent={riskScore}
            size="small"
            strokeColor={riskColor}
            format={(p) => (
              <span style={{ fontSize: 12, color: riskColor, fontWeight: 600 }}>
                {riskLevel === 'high' ? '高' : riskLevel === 'mid' ? '中' : '低'}
              </span>
            )}
          />
        </Tooltip>
      </div>

      <div className="text-xs text-ink-500 ml-auto flex items-center gap-3">
        <Space size="small">
          <span>
            <EnvironmentOutlined /> {asset.region}
          </span>
          <span>{asset.area.toLocaleString()}㎡</span>
          <span>
            <RiseOutlined /> 距地铁 {asset.features.subway_distance}m
          </span>
        </Space>
        {asset.hidden_risks && asset.hidden_risks.length > 0 && (
          <Tag color="red" bordered={false} className="!m-0">
            {asset.hidden_risks.length} 项隐性风险
          </Tag>
        )}
      </div>
    </div>
  );
}