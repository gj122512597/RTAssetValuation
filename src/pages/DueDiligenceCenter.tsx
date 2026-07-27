import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Tag,
  Button,
  Empty,
  Space,
  Progress,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  Tooltip,
  Table,
  Tag as AntTag,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  RightOutlined,
  FireOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import type { IntakeAsset, IntakeSource, IntakeStatus } from '@/types';

const SOURCE_LABELS: Record<IntakeSource, { label: string; color: string }> = {
  military_transfer: { label: '部队接收', color: 'red' },
  purchase: { label: '新购入', color: 'blue' },
  auction: { label: '拍卖竞得', color: 'orange' },
  government_grant: { label: '政府划拨', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const STATUS_META: Record<
  IntakeStatus,
  { label: string; color: string; icon: React.ReactNode; desc: string }
> = {
  todo: { label: '待办', color: 'blue', icon: <ClockCircleOutlined />, desc: '尚未开始现场尽调' },
  in_progress: { label: '进行中', color: 'orange', icon: <ExclamationCircleOutlined />, desc: '客户经理在跑清单' },
  completed: { label: '已完成', color: 'green', icon: <CheckCircleOutlined />, desc: '已入库' },
  rejected: { label: '已拒收', color: 'red', icon: <CloseCircleOutlined />, desc: '不通过' },
};

const PRIORITY_META = {
  high: { label: '高', color: 'red' },
  mid: { label: '中', color: 'orange' },
  low: { label: '低', color: 'default' },
} as const;

/**
 * 尽调工作台 v2（review 后重构）
 *
 * 主要改动：
 *  1. 去掉"全部" tab（3 个状态 tab + rejected 在底部折叠）
 *  2. 卡片列表 → Table 紧凑表格（一行/资产，可排序、可筛选）
 *  3. 顶部 KPI 简化为 2 个：紧急待办 + 进行中
 *  4. 加搜索 + 筛选（业态/区域/来源）
 *  5. 排序：priority（高→低）→ due_date（近→远）
 *  6. 当前 Tab = 唯一主视图，不再嵌套"全部"
 *  7. "新建尽调"按钮显眼（右上角大按钮）
 */
export default function DueDiligenceCenter() {
  const navigate = useNavigate();
  const intakeAssets = useAssetStore((s) => s.intakeAssets);
  const setIntakeStatus = useAssetStore((s) => s.setIntakeStatus);

  const [tab, setTab] = useState<IntakeStatus>('todo');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterRegion, setFilterRegion] = useState<string | undefined>();
  const [filterSource, setFilterSource] = useState<IntakeSource | undefined>();

  /** 按 status 分组 + 搜索 + 筛选 + 排序 */
  const visible = useMemo(() => {
    let result = intakeAssets.filter((i) => i.status === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.address?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterType) result = result.filter((i) => i.type === filterType);
    if (filterRegion) result = result.filter((i) => i.region === filterRegion);
    if (filterSource) result = result.filter((i) => i.source === filterSource);
    // 排序：priority 高→低，due_date 近→远
    const pOrder = { high: 0, mid: 1, low: 2 } as const;
    result.sort((a, b) => {
      const ap = pOrder[a.priority];
      const bp = pOrder[b.priority];
      if (ap !== bp) return ap - bp;
      const ad = a.due_date ?? '9999-99-99';
      const bd = b.due_date ?? '9999-99-99';
      return ad.localeCompare(bd);
    });
    return result;
  }, [intakeAssets, tab, search, filterType, filterRegion, filterSource]);

  /** 各状态统计 */
  const counts = useMemo(
    () => ({
      todo: intakeAssets.filter((i) => i.status === 'todo').length,
      in_progress: intakeAssets.filter((i) => i.status === 'in_progress').length,
      completed: intakeAssets.filter((i) => i.status === 'completed').length,
      rejected: intakeAssets.filter((i) => i.status === 'rejected').length,
      high: intakeAssets.filter((i) => i.priority === 'high' && i.status !== 'completed').length,
    }),
    [intakeAssets]
  );

  /** 全部区域 / 来源去重 */
  const allRegions = useMemo(
    () => Array.from(new Set(intakeAssets.map((i) => i.region))).filter(Boolean),
    [intakeAssets]
  );
  const allTypes = useMemo(
    () => Array.from(new Set(intakeAssets.map((i) => i.type))).filter(Boolean),
    [intakeAssets]
  );

  const handleStart = (i: IntakeAsset) => {
    if (i.status === 'todo') setIntakeStatus(i.id, 'in_progress');
    navigate(`/due-diligence/${i.id}`);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回 Dashboard
        </Button>
        <FileTextOutlined style={{ color: '#1f6feb', fontSize: 18 }} />
        <h2 className="text-lg font-semibold m-0">尽调工作台</h2>
        <Tag color="orange" bordered={false}>业务升级 · 标准化流程</Tag>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="primary"
            size="middle"
            icon={<PlusOutlined />}
            onClick={() => navigate('/due-diligence/new')}
          >
            新建尽调
          </Button>
        </div>
      </div>

      {/* 顶部 KPI：只突出 actionable 状态（待办 + 进行中 + 高优先级） */}
      <div className="px-6 py-3 bg-white border-b border-ink-100">
        <Row gutter={[12, 12]}>
          <Col span={8}>
            <Card
              size="small"
              className="!shadow-card !border-blue-200"
              style={{ background: counts.todo > 0 ? '#eaf1ff' : undefined }}
            >
              <Statistic
                title={
                  <span className="text-xs flex items-center gap-1">
                    <ClockCircleOutlined /> 待办
                  </span>
                }
                value={counts.todo}
                suffix="条"
                valueStyle={{ fontSize: 28, color: counts.todo > 0 ? '#1f6feb' : '#94a3b8', fontWeight: 700 }}
              />
              {counts.todo > 0 && (
                <div className="text-[11px] text-blue-600 mt-0.5">→ 立即开始 →</div>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" className="!shadow-card">
              <Statistic
                title={
                  <span className="text-xs flex items-center gap-1">
                    <ExclamationCircleOutlined /> 进行中
                  </span>
                }
                value={counts.in_progress}
                suffix="条"
                valueStyle={{ fontSize: 28, color: '#f59e0b', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              size="small"
              className="!shadow-card !border-red-200"
              style={{ background: counts.high > 0 ? '#fef2f2' : undefined }}
            >
              <Statistic
                title={
                  <span className="text-xs flex items-center gap-1">
                    <FireOutlined /> 高优先级（未完成）
                  </span>
                }
                value={counts.high}
                suffix="条"
                valueStyle={{ fontSize: 28, color: counts.high > 0 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}
              />
              {counts.high > 0 && (
                <div className="text-[11px] text-red-600 mt-0.5">⚠ 截止日近 + 高优先级</div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* 主区：Tab + 搜索/筛选 + 表格 */}
      <div className="flex-1 p-6">
        <Card className="!shadow-card">
          {/* Tab 头 */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <Tabs
              activeKey={tab}
              onChange={(k) => setTab(k as IntakeStatus)}
              items={[
                { key: 'todo', label: `待办 (${counts.todo})` },
                { key: 'in_progress', label: `进行中 (${counts.in_progress})` },
                { key: 'completed', label: `已完成 (${counts.completed})` },
                { key: 'rejected', label: `已拒收 (${counts.rejected})` },
              ]}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="搜索资产名 / ID / 地址"
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ width: 220 }}
              />
              <Select
                placeholder="业态"
                value={filterType}
                onChange={setFilterType}
                allowClear
                style={{ width: 110 }}
                options={allTypes.map((t) => ({ value: t, label: t }))}
              />
              <Select
                placeholder="区域"
                value={filterRegion}
                onChange={setFilterRegion}
                allowClear
                style={{ width: 110 }}
                options={allRegions.map((r) => ({ value: r, label: r }))}
              />
              <Select
                placeholder="来源"
                value={filterSource}
                onChange={(v) => setFilterSource(v as IntakeSource)}
                allowClear
                style={{ width: 110 }}
                options={Object.entries(SOURCE_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                }))}
              />
              {(filterType || filterRegion || filterSource || search) && (
                <Button
                  size="small"
                  type="text"
                  onClick={() => {
                    setFilterType(undefined);
                    setFilterRegion(undefined);
                    setFilterSource(undefined);
                    setSearch('');
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* 表格主体 */}
          <Table
            rowKey="id"
            dataSource={visible}
            pagination={false}
            size="middle"
            locale={{
              emptyText: <Empty description={`当前筛选下无${STATUS_META[tab].label}资产`} />,
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                width: 130,
                fixed: 'left',
                render: (v: string) => (
                  <code className="text-[11px] text-ink-500 bg-ink-50 px-1 rounded">
                    {v}
                  </code>
                ),
              },
              {
                title: '资产',
                dataIndex: 'name',
                render: (_v, r) => (
                  <div>
                    <div className="font-medium text-ink-900">{r.name}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5 truncate max-w-md">
                      {r.address ?? '—'}
                    </div>
                  </div>
                ),
              },
              {
                title: '业态 / 区域',
                width: 180,
                render: (_v, r) => (
                  <div>
                    <Tag color="blue" bordered={false}>{r.type}</Tag>
                    <span className="text-[11px] text-ink-500 ml-1">{r.region}</span>
                    {r.area && (
                      <div className="text-[11px] text-ink-500 mt-0.5">
                        {r.area.toLocaleString()} ㎡
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: '来源 / 优先级',
                width: 160,
                render: (_v, r) => (
                  <div className="space-y-1">
                    <Tag color={SOURCE_LABELS[r.source].color} bordered={false}>
                      {SOURCE_LABELS[r.source].label}
                    </Tag>
                    <div>
                      <Tag color={PRIORITY_META[r.priority].color} bordered={false}>
                        {PRIORITY_META[r.priority].label}优先
                      </Tag>
                    </div>
                  </div>
                ),
              },
              {
                title: '提交人',
                dataIndex: 'submitted_by',
                width: 90,
              },
              {
                title: '截止',
                dataIndex: 'due_date',
                width: 110,
                render: (v: string | undefined) => {
                  if (!v) return <span className="text-xs text-ink-300">—</span>;
                  const days = Math.ceil(
                    (new Date(v).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const color =
                    days < 0 ? 'red' : days < 7 ? 'orange' : 'default';
                  return (
                    <Tooltip title={days < 0 ? `已逾期 ${-days} 天` : `还有 ${days} 天`}>
                      <Tag color={color} bordered={false}>{v.slice(5)}</Tag>
                    </Tooltip>
                  );
                },
              },
              {
                title: '进度',
                width: 120,
                render: (_v, r) => {
                  if (r.status === 'todo' || !r.progress) {
                    return <span className="text-xs text-ink-300">未开始</span>;
                  }
                  const p = Math.round(r.progress.completion * 100);
                  return (
                    <Progress
                      percent={p}
                      size="small"
                      strokeColor={p === 100 ? '#22c55e' : '#1f6feb'}
                    />
                  );
                },
              },
              {
                title: '操作',
                width: 110,
                fixed: 'right',
                render: (_v, r) => {
                  if (r.status === 'todo') {
                    return (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleStart(r)}
                      >
                        开始
                      </Button>
                    );
                  }
                  if (r.status === 'in_progress') {
                    return (
                      <Button size="small" type="primary" onClick={() => handleStart(r)}>
                        继续
                      </Button>
                    );
                  }
                  if (r.status === 'completed') {
                    return r.result_asset_id ? (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => navigate(`/asset/${r.result_asset_id}`)}
                      >
                        查看资产
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-500">已入池</span>
                    );
                  }
                  if (r.status === 'rejected') {
                    return (
                      <Button size="small" type="link" onClick={() => handleStart(r)}>
                        查看理由
                      </Button>
                    );
                  }
                  return null;
                },
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}