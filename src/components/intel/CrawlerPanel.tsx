import { Card, Table, Tag, Switch, Tooltip, Space, Button } from 'antd';
import { useMemo } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import type { CrawlerTask } from '@/types';

const SOURCE_LABEL: Record<CrawlerTask['source'], { text: string; color: string }> = {
  beike: { text: '贝壳', color: 'geekblue' },
  '58': { text: '58 同城', color: 'orange' },
  fangtianxia: { text: '房天下', color: 'purple' },
  lianjia: { text: '链家', color: 'green' },
};

/**
 * 竞品情报库（M3 P3-1）
 *  - 爬虫任务列表
 *  - 每个任务：数据源 / 区域 / cron / 最后运行 / 记录数 / 状态 / 校准数
 *  - 一键启停
 */
export default function CrawlerPanel({ onCreateClick }: { onCreateClick?: () => void }) {
  const tasks = useAssetStore((s) => s.crawlerTasks);
  const setStatus = useAssetStore((s) => s.setCrawlerTaskStatus);

  const summary = useMemo(() => {
    const total = tasks.length;
    const running = tasks.filter((t) => t.status === 'running').length;
    const records = tasks.reduce((s, t) => s + t.record_count, 0);
    const calibrated = tasks.reduce((s, t) => s + t.manual_calibrated, 0);
    return { total, running, records, calibrated };
  }, [tasks]);

  return (
    <Card
      title={
        <Space>
          <span>竞品情报库</span>
          <Tag color="blue" bordered={false}>
            {summary.records.toLocaleString()} 条记录
          </Tag>
          <Tag color="green" bordered={false}>
            {summary.calibrated} 条人工校准
          </Tag>
        </Space>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Space size="small">
          <span className="text-xs text-gray-500">运行中 {summary.running} / {summary.total}</span>
          <Button size="small" type="primary" onClick={onCreateClick}>
            新建任务
          </Button>
        </Space>
      }
    >
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={tasks}
        columns={[
          {
            title: '数据源',
            dataIndex: 'source',
            key: 'source',
            render: (s: CrawlerTask['source']) => (
              <Tag color={SOURCE_LABEL[s].color} bordered={false}>
                {SOURCE_LABEL[s].text}
              </Tag>
            ),
          },
          { title: '区域', dataIndex: 'region', key: 'region' },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (s: CrawlerTask['status'], r: CrawlerTask) => (
              <Tooltip title={s === 'error' ? '上次执行失败：连接超时' : ''}>
                <Switch
                  size="small"
                  checked={s === 'running'}
                  onChange={(v) => setStatus(r.id, v ? 'running' : 'paused')}
                  disabled={s === 'error'}
                />
              </Tooltip>
            ),
          },
          { title: '调度', dataIndex: 'schedule', key: 'schedule', render: (s: string) => <code className="text-xs">{s}</code> },
          { title: '最后运行', dataIndex: 'last_run_at', key: 'last_run_at', width: 130 },
          {
            title: '记录数',
            dataIndex: 'record_count',
            key: 'record_count',
            render: (v: number) => v.toLocaleString(),
          },
          {
            title: '人工校准',
            dataIndex: 'manual_calibrated',
            key: 'manual_calibrated',
            render: (v: number, r: CrawlerTask) =>
              v > 0 ? <Tag color="orange" bordered={false}>{v} 条</Tag> : '—',
          },
        ]}
      />
    </Card>
  );
}
