import { useEffect, useState } from 'react';
import { Card, Button, Space, Tag } from 'antd';
import { EmptyState } from '@/components/common/StateViews';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '@/stores/assetStore';
import CrawlerPanel from '@/components/intel/CrawlerPanel';
import NewCrawlerTaskDrawer from '@/components/intel/NewCrawlerTaskDrawer';
import PoiCrawlPanel from '@/components/intel/PoiCrawlPanel';
import LianjiaCrawlPanel from '@/components/intel/LianjiaCrawlPanel';

/**
 * 外部数据"情报站"（M3 P3-1）
 *   - 爬虫任务管理
 *   - 新建任务抽屉
 */
export default function IntelPage() {
  const navigate = useNavigate();
  const loadAll = useAssetStore((s) => s.loadAll);
  const tasks = useAssetStore((s) => s.crawlerTasks);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    if (tasks.length === 0) void loadAll();
  }, [tasks.length, loadAll]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex flex-wrap items-center gap-2">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回地图
        </Button>
        <h2 className="text-lg font-semibold m-0">外部数据情报站</h2>
        <Tag color="default" bordered={false}>P3-1 竞品情报库</Tag>
        <div className="ml-auto text-xs text-gray-500">仅展示爬虫/校准任务概览</div>
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        {/* 高德 POI 真实拉取 */}
        <PoiCrawlPanel />

        {/* 链家写字楼爬虫 */}
        <LianjiaCrawlPanel />

        {tasks.length === 0 ? (
          <EmptyState
            icon="🛰️"
            description="暂无爬虫任务"
            hint="点击右上角「新建任务」配置一个爬虫"
            actionText="新建任务"
            onAction={() => setNewTaskOpen(true)}
          />
        ) : (
          <>
            <Space>
              <Tag color="geekblue">数据来源</Tag>
              <span className="text-xs text-gray-500">
                贝壳 / 58 同城 / 房天下 / 链家
              </span>
            </Space>
            <CrawlerPanel onCreateClick={() => setNewTaskOpen(true)} />
          </>
        )}
        <NewCrawlerTaskDrawer open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />

        <Card title="数据合规说明" size="small">
          <ul className="text-xs text-gray-600 leading-relaxed list-disc pl-4">
            <li>本系统的爬虫任务均以 <b>公开</b> 数据为采集对象（贝壳/58/房天下），已对经纪人电话等字段在入库前自动脱敏。</li>
            <li>租户类内部数据（含历史成交价、租期）只通过"内部 ERP"通道读取，全程审计日志由 NFR §5 隐私办监管。</li>
            <li>一线人员可对脏数据做"人工校准"，记录将作为后续 OCR/NLP 模型的负样本反馈。</li>
            <li>POI 宏观数据（地铁线/商圈/人口）由采购供应商季度更新，本次 demo 已内嵌静态 mock，未来切真接口只需替换 <code>src/mocks/poi.json</code>。</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
