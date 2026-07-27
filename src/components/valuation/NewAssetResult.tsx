import { Card, Statistic, Tag, List, Table, Progress, Typography, Empty, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { NewAssetValuationResult, NeighborCompetitor } from './types';

const { Text, Title } = Typography;

interface Props {
  loading: boolean;
  result: NewAssetValuationResult | null;
  neighbors: NeighborCompetitor[];
}

export default function NewAssetResult({ loading, result, neighbors }: Props) {
  if (loading) {
    return (
      <Card size="small" title="② 估价结果">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin tip="正在调用 Hedonic 模型与周边竞品数据…" />
        </div>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card size="small" title="② 估价结果">
        <Empty description="填写左侧特征后，点击「调用模型生成建议租金」" />
      </Card>
    );
  }

  const maxAbs = Math.max(...result.contributions.map((c) => Math.abs(c.contribution)), 0.0001);
  const sorted = [...result.contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );

  const neighborColumns: ColumnsType<NeighborCompetitor> = [
    {
      title: '竞品',
      dataIndex: 'name',
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '挂牌价(元/㎡·天)',
      dataIndex: 'list_price',
      width: 120,
      sorter: (a, b) => a.list_price - b.list_price,
      render: (v: number) => <Text strong>{v?.toFixed(2) ?? '-'}</Text>,
    },
    { title: '距离km', dataIndex: 'distanceKm', width: 80, render: (v: number) => v.toFixed(2) },
    { title: '来源', dataIndex: 'source', width: 70, render: (v: string) => <Tag>{v}</Tag> },
  ];

  return (
    <Card
      size="small"
      title="② 估价结果"
      extra={
        <>
          <Tag color="purple">{result.method === 'comparative' ? '市场比较法' : '历史数据法'}</Tag>
          <Tag>{result.modelName}</Tag>
          <Tag color="blue">R²={result.r2}</Tag>
        </>
      }
    >
      {/* 建议日租金 */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <Text type="secondary">建议日租金（元/㎡·天）</Text>
        <div>
          <Title level={2} style={{ margin: '4px 0', color: '#1677ff' }}>
            ¥{result.center.toFixed(2)}
          </Title>
        </div>
        <Text type="secondary">
          建议区间：¥{result.rangeLow.toFixed(2)} ~ ¥{result.rangeHigh.toFixed(2)}
        </Text>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Card size="small" style={{ flex: 1 }} styles={{ body: { padding: 12 } }}>
          <Statistic
            title="周边竞品中位租金"
            value={result.benchmarkMedian}
            precision={2}
            prefix="¥"
            suffix="/㎡·天"
            valueStyle={{ fontSize: 18 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {result.neighborCount} 个竞品（{result.radiusKm}km 内）
          </Text>
        </Card>
        <Card size="small" style={{ flex: 1 }} styles={{ body: { padding: 12 } }}>
          <Statistic
            title="本地市场分位"
            value={result.percentile}
            suffix="%"
            valueStyle={{ fontSize: 18, color: '#52c41a' }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            高于 {result.percentile}% 周边竞品
          </Text>
        </Card>
        <Card size="small" style={{ flex: 1 }} styles={{ body: { padding: 12 } }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              置信度
            </Text>
          </div>
          <Progress
            type="circle"
            percent={Math.round(result.confidence * 100)}
            size={56}
            strokeColor="#1677ff"
          />
        </Card>
      </div>

      {/* 特征贡献分解 */}
      <Title level={5}>特征贡献分解（SHAP 风格 · 对数空间）</Title>
      <List
        size="small"
        dataSource={sorted}
        renderItem={(c) => {
          const pct = (Math.abs(c.contribution) / maxAbs) * 100;
          const positive = c.contribution >= 0;
          return (
            <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>
                    {c.feature_cn ?? c.feature}{' '}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {c.explanation ?? ''}
                    </Text>
                  </span>
                  <Text strong style={{ color: positive ? '#52c41a' : '#ff4d4f' }}>
                    {positive ? '+' : ''}
                    {c.contribution.toFixed(3)}
                  </Text>
                </div>
                <Progress
                  percent={pct}
                  showInfo={false}
                  size="small"
                  strokeColor={positive ? '#52c41a' : '#ff4d4f'}
                />
              </div>
            </List.Item>
          );
        }}
      />

      {/* 周边竞品清单 */}
      <Title level={5}>周边可比竞品</Title>
      <Table<NeighborCompetitor>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={neighbors.slice(0, 10)}
        columns={neighborColumns}
        scroll={{ y: 220 }}
      />
    </Card>
  );
}
