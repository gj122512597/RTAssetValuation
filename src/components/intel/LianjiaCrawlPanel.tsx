import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Select, InputNumber, Tabs, Switch, Input, Tag, Space, Statistic, Row, Col, Alert, message, Timeline } from 'antd';
import { CloudDownloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface CrawlStatus {
  id: number; task_id: string; started_at: string; finished_at: string | null;
  status: 'running' | 'success' | 'failed' | 'idle';
  records_fetched: number; records_saved: number;
  log_detail: string | null; error_message: string | null;
  task_name: string; record_count: number;
}

export default function LianjiaCrawlPanel() {
  const assets = useAssetStore((s) => s.assets);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [maxPages, setMaxPages] = useState(3);
  const [crawling, setCrawling] = useState(false);
  const [status, setStatus] = useState<CrawlStatus | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cron, setCron] = useState('0 8 * * *');
  const [scheduled, setScheduled] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/crawl-tasks/lianjia/status`);
      if (!res.ok) return;
      const data = await res.json() as CrawlStatus;
      setStatus(data);
      if (data.log_detail) setLogLines(data.log_detail.split('\n').filter(Boolean));
    } catch { /* 后端未启动 */ }
  }, []);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (crawling) {
      pollRef.current = setInterval(fetchStatus, 2000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [crawling, fetchStatus]);

  useEffect(() => {
    if (crawling && status && (status.status === 'success' || status.status === 'failed')) {
      setCrawling(false);
      void fetchStatus();
      if (status.status === 'success') message.success('链家爬取完成');
      else message.error('链家爬取失败');
    }
  }, [status, crawling, fetchStatus]);

  const handleCrawl = async () => {
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) {
      message.error('请选择资产');
      return;
    }
    // 从资产区域提取链家爬取区域（如"朝阳区"→"朝阳"）
    const region = asset.region.replace(/区$/, '');
    setCrawling(true);
    setLogLines([]);
    try {
      const res = await fetch(`${API_BASE}/crawl-tasks/lianjia/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, max_pages: maxPages }),
      });
      if (!res.ok) throw new Error('触发失败');
      message.info('链家爬虫已启动，正在后台执行...');
      setTimeout(fetchStatus, 1000);
    } catch (e) {
      message.error(`启动失败: ${(e as Error).message}（后端服务是否启动？）`);
      setCrawling(false);
    }
  };

  const handleScheduleToggle = async (enabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/crawl-tasks/lianjia/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron, enabled }),
      });
      if (!res.ok) throw new Error('配置失败');
      setScheduled(enabled);
      message.success(enabled ? `定时爬取已启用（${cron}）` : '定时爬取已暂停');
    } catch (e) {
      message.error(`配置失败: ${(e as Error).message}`);
    }
  };

  const handleSaveCron = async () => {
    try {
      const res = await fetch(`${API_BASE}/crawl-tasks/lianjia/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron, enabled: scheduled }),
      });
      if (!res.ok) throw new Error('保存失败');
      message.success('Cron 表达式已保存');
    } catch (e) {
      message.error(`保存失败: ${(e as Error).message}`);
    }
  };

  const isRunning = crawling || (status?.status === 'running');

  return (
    <Card
      title={
        <Space>
          <CloudDownloadOutlined style={{ color: '#722ed1' }} />
          <span>链家写字楼爬虫</span>
          <Tag color="purple" bordered={false}>真实爬取</Tag>
        </Space>
      }
      size="small"
      className="!shadow-card"
      extra={status && (
        <Tag color={status.status === 'success' ? 'green' : status.status === 'running' ? 'blue' : status.status === 'failed' ? 'red' : 'default'} bordered={false}>
          {status.record_count > 0 ? `累计 ${status.record_count} 条` : '无记录'}
        </Tag>
      )}
    >
      <Tabs items={[
        {
          key: 'instant',
          label: '立即爬取',
          children: (
            <div className="space-y-4">
              <Alert type="info" showIcon
                message="选择资产后爬取该资产所在区域的链家租房数据"
                description="自动从资产区域提取链家爬取范围，每页间隔 3-5 秒（反爬限流）。数据写入 competitor_listings 表。"
              />
              <Row gutter={12} align="middle">
                <Col flex="auto">
                  <Select value={selectedAssetId} onChange={setSelectedAssetId} placeholder="选择资产"
                    showSearch optionFilterProp="label" style={{ width: '100%' }}
                    options={assets.map((a) => ({ value: a.id, label: `${a.name} (${a.id}) · ${a.region}` }))} />
                </Col>
                <Col>
                  <InputNumber value={maxPages} onChange={(v) => setMaxPages(v ?? 3)} min={1} max={5}
                    addonBefore="页数" style={{ width: 120 }} />
                </Col>
                <Col>
                  <Button type="primary" icon={<CloudDownloadOutlined />} loading={isRunning} onClick={handleCrawl}
                    disabled={!selectedAssetId}>
                    {isRunning ? '爬取中...' : '开始爬取'}
                  </Button>
                </Col>
              </Row>

              {logLines.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">{isRunning ? '实时进度' : '执行日志'}</span>
                    {status?.started_at && <span className="text-[10px] text-gray-400">{status.started_at}</span>}
                  </div>
                  <div className="bg-gray-900 rounded-md p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
                    {logLines.map((line, i) => {
                      const isDone = line.includes('完成') || line.includes('===');
                      const isError = line.includes('失败') || line.includes('错误') || line.includes('异常');
                      const isProgress = line.includes('正在') || line.includes('等待');
                      return (
                        <div key={i} className={isDone ? 'text-green-400' : isError ? 'text-red-400' : isProgress ? 'text-blue-400' : 'text-gray-300'}>
                          {line}
                        </div>
                      );
                    })}
                    {isRunning && <div className="text-yellow-400 animate-pulse">▋ 等待更新...</div>}
                  </div>
                </div>
              )}

              {status && !isRunning && (status.records_fetched > 0 || status.status === 'failed') && (
                <Row gutter={16}>
                  <Col span={8}><Statistic title="拉取" value={status.records_fetched} suffix="条" /></Col>
                  <Col span={8}><Statistic title="入库" value={status.records_saved} suffix="条" valueStyle={{ color: '#52c41a' }} /></Col>
                  <Col span={8}><Statistic title="状态" value={status.status === 'success' ? '成功' : '失败'} valueStyle={status.status === 'success' ? { color: '#52c41a' } : { color: '#ff4d4f' }} /></Col>
                </Row>
              )}
              {status?.error_message && <Alert type="error" showIcon message="爬取出错" description={status.error_message} />}
            </div>
          ),
        },
        {
          key: 'schedule',
          label: '定时爬取',
          children: (
            <div className="space-y-4">
              <Alert type="info" showIcon message="配置定时爬取任务"
                description="按 cron 表达式定时自动爬取链家数据。任务在后端执行，无需页面保持打开。" />
              <div className="flex items-center gap-3">
                <ClockCircleOutlined className="text-gray-400" />
                <span className="text-sm text-gray-600">调度表达式：</span>
                <Input value={cron} onChange={(e) => setCron(e.target.value)} style={{ width: 200 }} placeholder="0 8 * * *" />
                <Button size="small" onClick={handleSaveCron}>保存</Button>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={scheduled} onChange={handleScheduleToggle} />
                <span className="text-sm">{scheduled ? '定时爬取已启用' : '定时爬取已暂停'}</span>
                {scheduled && <Tag color="green" bordered={false}>每天 {cron?.split(' ')?.[1] || '8'}:00 执行</Tag>}
              </div>
              <div className="text-[11px] text-gray-400 space-y-1">
                <div>Cron 格式：分 时 日 月 周（如 <code>0 8 * * *</code> = 每天 8:00）</div>
                <div>示例：<code>0 8 * * *</code> 每天 8 点 | <code>0 */6 * * *</code> 每 6 小时</div>
              </div>
            </div>
          ),
        },
        {
          key: 'history',
          label: '爬取历史',
          children: <CrawlHistory />,
        },
      ]} />
    </Card>
  );
}

function CrawlHistory() {
  const [logs, setLogs] = useState<Array<{ id: number; started_at: string; finished_at: string | null; status: string; records_saved: number; records_fetched: number; error_message: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/crawl-tasks/task-lianjia/logs?limit=20`);
        if (res.ok) setLogs(await res.json());
      } catch { /* 后端未启动 */ }
      setLoading(false);
    };
    void fetchLogs();
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-4">加载中...</div>;
  if (logs.length === 0) return <div className="text-center text-gray-400 py-4">暂无爬取记录</div>;

  return (
    <Timeline items={logs.map((log) => ({
      color: log.status === 'success' ? 'green' : log.status === 'failed' ? 'red' : 'blue',
      children: (
        <div key={log.id} className="text-xs">
          <div className="font-medium">{log.started_at}</div>
          <div className="text-gray-500 mt-1">
            状态: <Tag color={log.status === 'success' ? 'green' : log.status === 'failed' ? 'red' : 'blue'} bordered={false} style={{ fontSize: 10 }}>{log.status}</Tag>
            {' '}拉取 {log.records_fetched} 条，入库 {log.records_saved} 条
          </div>
          {log.error_message && <div className="text-red-500 mt-1">{log.error_message}</div>}
        </div>
      ),
    }))} />
  );
}
