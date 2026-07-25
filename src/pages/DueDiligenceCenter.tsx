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
  Tooltip,
  Segmented,
  Badge,
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

const STATUS_LABELS: Record<
  IntakeStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  todo: { label: '待办', color: 'blue', icon: <ClockCircleOutlined /> },
  in_progress: { label: '进行中', color: 'orange', icon: <ExclamationCircleOutlined /> },
  completed: { label: '已完成', color: 'green', icon: <CheckCircleOutlined /> },
  rejected: { label: '已拒收', color: 'red', icon: <CloseCircleOutlined /> },
};

const PRIORITY_LABELS = {
  high: { label: '高', color: 'red' },
  mid: { label: '中', color: 'orange' },
  low: { label: '低', color: 'default' },
} as const;

/**
 * 尽调工作台（独立模块 / 独立路由）
 *  - 3 个 Tab：待办 / 进行中 / 已完成
 *  - 点入 → /due-diligence/:id（流程页）
 *  - 新建 → /due-diligence/new
 *
 *  业务流：
 *   [部队接收] → todo  → 用户开始尽调 → in_progress
 *                → 完成 → completed → 自动入池（result_asset_id）
 */
export default function DueDiligenceCenter() {
  const navigate = useNavigate();
  const intakeAssets = useAssetStore((s) => s.intakeAssets);
  const setIntakeStatus = useAssetStore((s) => s.setIntakeStatus);
  const [tab, setTab] = useState<IntakeStatus | 'all'>('todo');

  /** 按 status 分组 */
  const grouped = useMemo(() => {
    const result: Record<IntakeStatus, IntakeAsset[]> = {
      todo: [],
      in_progress: [],
      completed: [],
      rejected: [],
    };
    for (const i of intakeAssets) {
      result[i.status].push(i);
    }
    // 待办排优先级
    for (const arr of Object.values(result)) {
      arr.sort((a, b) => {
        const ap = a.priority === 'high' ? 0 : a.priority === 'mid' ? 1 : 2;
        const bp = b.priority === 'high' ? 0 : b.priority === 'mid' ? 1 : 2;
        return ap - bp;
      });
    }
    return result;
  }, [intakeAssets]);

  const counts = useMemo(() => {
    return {
      todo: grouped.todo.length,
      in_progress: grouped.in_progress.length,
      completed: grouped.completed.length,
      rejected: grouped.rejected.length,
      total: intakeAssets.length,
    };
  }, [grouped, intakeAssets]);

  const startCheck = (i: IntakeAsset) => {
    if (i.status === 'todo') setIntakeStatus(i.id, 'in_progress');
    navigate(`/due-diligence/${i.id}`);
  };

  const viewResult = (i: IntakeAsset) => {
    if (i.result_asset_id) navigate(`/asset/${i.result_asset_id}`);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
        >
          返回 Dashboard
        </Button>
        <FileTextOutlined style={{ color: '#1f6feb' }} />
        <h2 className="text-lg font-semibold m-0">尽调工作台</h2>
        <Tag color="orange" bordered={false}>业务升级 · 标准化流程</Tag>
        <span className="ml-auto text-xs text-ink-500">
          {counts.total} 个待尽调资产
        </span>
      </div>

      {/* 顶部 KPI */}
      <div className="px-6 py-3 bg-white border-b border-ink-100">
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">待办</span>}
                value={counts.todo}
                suffix="条"
                prefix={<ClockCircleOutlined style={{ color: '#1f6feb' }} />}
                valueStyle={{ fontSize: 22, color: '#1f6feb' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">进行中</span>}
                value={counts.in_progress}
                suffix="条"
                prefix={<ExclamationCircleOutlined style={{ color: '#f59e0b' }} />}
                valueStyle={{ fontSize: 22, color: '#f59e0b' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">已完成</span>}
                value={counts.completed}
                suffix="条"
                prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
                valueStyle={{ fontSize: 22, color: '#22c55e' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">已拒收</span>}
                value={counts.rejected}
                suffix="条"
                prefix={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
                valueStyle={{ fontSize: 22, color: '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 主区 */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-card border border-ink-100">
          <div className="px-4 pt-3 pb-0 flex items-center gap-3">
            <Tabs
              className="flex-1"
              activeKey={tab}
              onChange={(k) => setTab(k as IntakeStatus | 'all')}
              items={[
                {
                  key: 'todo',
                  label: (
                    <Badge count={counts.todo} size="small" offset={[6, 0]}>
                      <span>待办</span>
                    </Badge>
                  ),
                },
                {
                  key: 'in_progress',
                  label: (
                    <Badge count={counts.in_progress} size="small" offset={[6, 0]}>
                      <span>进行中</span>
                    </Badge>
                  ),
                },
                {
                  key: 'completed',
                  label: (
                    <Badge count={counts.completed} size="small" offset={[6, 0]}>
                      <span>已完成</span>
                    </Badge>
                  ),
                },
                {
                  key: 'rejected',
                  label: (
                    <Badge count={counts.rejected} size="small" offset={[6, 0]}>
                      <span>已拒收</span>
                    </Badge>
                  ),
                },
                {
                  key: 'all',
                  label: `全部 ${counts.total}`,
                },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/due-diligence/new')}
            >
              新建尽调
            </Button>
          </div>

          <div className="p-4">
            {tab === 'all' ? (
              <Tabs
                size="small"
                items={(['todo', 'in_progress', 'completed', 'rejected'] as const).map((s) => ({
                  key: s,
                  label: `${STATUS_LABELS[s].label} (${counts[s]})`,
                  children: <IntakeList list={grouped[s]} onStart={startCheck} onViewResult={viewResult} />,
                }))}
              />
            ) : (
              <IntakeList
                list={grouped[tab as IntakeStatus]}
                onStart={startCheck}
                onViewResult={viewResult}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntakeList({
  list,
  onStart,
  onViewResult,
}: {
  list: IntakeAsset[];
  onStart: (i: IntakeAsset) => void;
  onViewResult: (i: IntakeAsset) => void;
}) {
  if (list.length === 0) {
    return <Empty description="暂无该状态资产" />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((i) => {
        const src = SOURCE_LABELS[i.source];
        const st = STATUS_LABELS[i.status];
        const pr = PRIORITY_LABELS[i.priority];
        const progress = i.progress;
        const completionPct = progress
          ? Math.round((progress.completion ?? 0) * 100)
          : 0;
        return (
          <Card
            key={i.id}
            size="small"
            className="!shadow-card hover:!shadow-pop transition-shadow"
            bordered
            title={
              <div className="flex items-center gap-2">
                <Tag color={st.color} bordered={false} icon={st.icon as React.ReactNode}>
                  {st.label}
                </Tag>
                {i.priority === 'high' && (
                  <Tag color="red" bordered={false} icon={<FireOutlined />}>
                    高优先级
                  </Tag>
                )}
                <span className="text-xs text-ink-500 ml-auto">{i.id}</span>
              </div>
            }
          >
            <div className="space-y-2">
              <div>
                <div className="text-sm font-semibold text-ink-900 truncate">
                  {i.name}
                </div>
                <div className="text-xs text-ink-500 mt-0.5 truncate">{i.address}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <Tag bordered={false} color={src.color}>
                  {src.label}
                </Tag>
                <span className="text-ink-500">{i.region}</span>
                {i.area && (
                  <span className="text-ink-500">{i.area.toLocaleString()}㎡</span>
                )}
                {i.initial_price && (
                  <span className="text-brand font-semibold">¥{i.initial_price}</span>
                )}
              </div>
              {progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-ink-500">
                    <span>完成度 {completionPct}%</span>
                    <span>
                      必检 {progress.checks.filter((c) => {
                        // 需要从模板查 required
                        return progress.checks.find((ck) => ck.id === c.id)?.required;
                      }).length}/{/* 这部分简化 */} 项
                    </span>
                  </div>
                  <Progress percent={completionPct} size="small" showInfo={false} />
                </div>
              )}
              <div className="text-[10px] text-ink-500 flex items-center gap-1">
                <span>提交人：{i.submitted_by}</span>
                <span>· {i.submitted_at.slice(0, 10)}</span>
                {i.due_date && (
                  <Tag color={pr.color} bordered={false} className="!m-0">
                    截止 {i.due_date}
                  </Tag>
                )}
              </div>
              <div className="pt-1">
                {i.status === 'todo' && (
                  <Button
                    type="primary"
                    block
                    icon={<RightOutlined />}
                    onClick={() => onStart(i)}
                  >
                    开始尽调
                  </Button>
                )}
                {i.status === 'in_progress' && (
                  <Button
                    type="primary"
                    block
                    icon={<RightOutlined />}
                    onClick={() => onStart(i)}
                  >
                    继续尽调
                  </Button>
                )}
                {i.status === 'completed' && (
                  <Button
                    block
                    type="default"
                    onClick={() => onStart(i)}
                    icon={<FileTextOutlined />}
                  >
                    查看报告
                  </Button>
                )}
                {i.status === 'rejected' && (
                  <Button
                    block
                    danger
                    onClick={() => onStart(i)}
                  >
                    查看拒收理由
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}