import { Card, Statistic, Row, Col, Progress } from 'antd';
import { HomeOutlined, AreaChartOutlined, RiseOutlined, DollarOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { useMemo } from 'react';

/**
 * 聚合统计栏（M1 PRD §2 P1-2）：
 *   总资产数 / 总建面 / 平均出租率 / 本月预估租金收入 / AI 评估覆盖率
 */
export default function StatBar() {
  const assets = useAssetStore((s) => s.assets);

  const stats = useMemo(() => {
    if (assets.length === 0) {
      return {
        count: 0,
        totalArea: 0,
        avgOccupancy: 0,
        monthlyRevenue: 0,
        aiCoverage: 0,
      };
    }
    const totalArea = assets.reduce((s, a) => s + a.area, 0);
    const totalRevenue = assets.reduce((s, a) => s + (a.monthly_rent ?? 0), 0);
    const occupiedAssets = assets.filter((a) => a.status === 'leased');
    const avgOcc =
      occupiedAssets.length > 0
        ? occupiedAssets.reduce((s, a) => s + (a.occupancy_rate ?? 0), 0) /
          occupiedAssets.length
        : 0;
    const aiCovered = assets.filter((a) => a.confidence > 0).length;
    return {
      count: assets.length,
      totalArea,
      avgOccupancy: Number((avgOcc * 100).toFixed(1)),
      monthlyRevenue: totalRevenue,
      aiCoverage: Number(((aiCovered / assets.length) * 100).toFixed(1)),
    };
  }, [assets]);

  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 p-4">
      <Row gutter={[16, 0]}>
        <Col flex="1 1 0">
          <Card size="small" className="!shadow-none !border-0">
            <Statistic
              title={
                <span className="text-xs flex items-center gap-1">
                  <HomeOutlined /> 资产总数
                </span>
              }
              value={stats.count}
              suffix="处"
              valueStyle={{ fontSize: 22, color: '#1f6feb' }}
            />
          </Card>
        </Col>
        <Col flex="1 1 0">
          <Card size="small" className="!shadow-none !border-0">
            <Statistic
              title={
                <span className="text-xs flex items-center gap-1">
                  <AreaChartOutlined /> 总建面
                </span>
              }
              value={stats.totalArea}
              valueStyle={{ fontSize: 22 }}
              suffix="㎡"
            />
          </Card>
        </Col>
        <Col flex="1 1 0">
          <Card size="small" className="!shadow-none !border-0">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <RiseOutlined /> 平均出租率
            </div>
            <div className="text-xl font-bold">{stats.avgOccupancy}%</div>
            <Progress
              percent={stats.avgOccupancy}
              showInfo={false}
              size="small"
              strokeColor="#22c55e"
            />
          </Card>
        </Col>
        <Col flex="1 1 0">
          <Card size="small" className="!shadow-none !border-0">
            <Statistic
              title={
                <span className="text-xs flex items-center gap-1">
                  <DollarOutlined /> 本月预估收入
                </span>
              }
              value={stats.monthlyRevenue}
              valueStyle={{ fontSize: 20 }}
              prefix="¥"
              formatter={(v) => {
                const n = Number(v);
                if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
                if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
                return n.toLocaleString();
              }}
            />
          </Card>
        </Col>
        <Col flex="1 1 0">
          <Card size="small" className="!shadow-none !border-0">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <ExperimentOutlined /> AI 评估覆盖率
            </div>
            <div className="text-xl font-bold">{stats.aiCoverage}%</div>
            <Progress
              percent={stats.aiCoverage}
              showInfo={false}
              size="small"
              strokeColor="#1f6feb"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}