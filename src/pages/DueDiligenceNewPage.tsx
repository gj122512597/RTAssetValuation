import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  InputNumber,
  Radio,
  message,
  Space,
  Result,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { getTemplateForType } from '@/mocks/due_diligence_templates';
import type { IntakeSource } from '@/types';

const SOURCE_OPTIONS: { value: IntakeSource; label: string; description: string }[] = [
  { value: 'military_transfer', label: '部队接收', description: '国/军资产接收（最常见）' },
  { value: 'purchase', label: '新购入', description: '市场化买入' },
  { value: 'auction', label: '拍卖竞得', description: '司法拍卖' },
  { value: 'government_grant', label: '政府划拨', description: '国资划转' },
  { value: 'other', label: '其他', description: '' },
];

const TYPE_OPTIONS = [
  { value: 'office', label: '写字楼', emoji: '🏢' },
  { value: 'retail', label: '商铺', emoji: '🏪' },
  { value: 'hotel', label: '酒店', emoji: '🏨' },
  { value: 'apartment', label: '公寓', emoji: '🏠' },
  { value: 'warehouse', label: '仓库', emoji: '📦' },
  { value: 'plant', label: '厂房', emoji: '🏭' },
];

/**
 * 新建尽调 v2（review 后重构）
 *  - 单屏式（一页填完），去掉 3 步 wizard
 *  - 必填标红 *，提交后 1 秒跳到流程页
 */
export default function DueDiligenceNewPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const intakeAssets = useAssetStore((s) => s.intakeAssets);

  const handleStart = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      const id = `RT-INT-2026-${String(intakeAssets.length + 100).padStart(3, '0')}`;
      const tpl = getTemplateForType(values.type);

      useAssetStore.setState((s) => ({
        intakeAssets: [
          {
            id,
            name: values.name,
            type: values.type,
            region: values.region,
            address: values.address,
            area: values.area,
            initial_price: values.initial_price,
            source: values.source,
            priority: values.priority || 'mid',
            submitted_by: '当前用户',
            submitted_at: new Date().toISOString(),
            due_date: values.due_date,
            status: 'in_progress',
            progress: {
              assetId: id,
              templateId: tpl.id,
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              checks: tpl.categories.flatMap((cat) =>
                cat.items.map((item) => ({
                  id: item.id,
                  category: cat.name,
                  label: item.label,
                  required: item.required,
                  result: 'pending' as const,
                  photos: [],
                }))
              ),
              completion: 0,
              score: 0,
              requiredDone: false,
              status: 'in_progress',
            },
          },
          ...s.intakeAssets,
        ],
      }));

      message.success(`已创建 ${id}，跳转至流程页`);
      setTimeout(() => navigate(`/due-diligence/${id}`), 400);
    } catch {
      message.error('请检查必填项');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/due-diligence')}>
          返回工作台
        </Button>
        <RocketOutlined style={{ color: '#1f6feb' }} />
        <h2 className="text-lg font-semibold m-0">新建尽调</h2>
        <Tag color="orange" bordered={false}>业务升级 · 标准化流程</Tag>
      </div>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <Card className="!shadow-card">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ source: 'military_transfer', priority: 'mid' }}
            requiredMark
            onFinish={handleStart}
          >
            <Form.Item
              label="资产来源"
              name="source"
              rules={[{ required: true, message: '请选择来源' }]}
            >
              <Select size="large" options={SOURCE_OPTIONS.map((o) => ({
                value: o.value,
                label: `${o.label}${o.description ? ' · ' + o.description : ''}`,
              }))} />
            </Form.Item>

            <Form.Item
              label="业态"
              name="type"
              rules={[{ required: true, message: '请选择业态' }]}
            >
              <Radio.Group className="w-full" buttonStyle="solid">
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((o) => (
                    <Radio.Button
                      key={o.value}
                      value={o.value}
                      className="!text-center !h-auto !py-2"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg">{o.emoji}</span>
                        <span className="text-xs">{o.label}</span>
                      </div>
                    </Radio.Button>
                  ))}
                </div>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="资产名（暂用）"
              name="name"
              rules={[{ required: true, message: '请输入资产名' }]}
            >
              <Input size="large" placeholder="如：朝阳 CBD 写字楼 A 座" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                label="区域"
                name="region"
                rules={[{ required: true, message: '请输入区域' }]}
              >
                <Input size="large" placeholder="如：朝阳区" />
              </Form.Item>
              <Form.Item label="截止日期" name="due_date">
                <Input type="date" size="large" />
              </Form.Item>
            </div>

            <Form.Item label="详细地址（选填）" name="address">
              <Input placeholder="如：北京市朝阳区光华路 50 号" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="面积（㎡）" name="area">
                <InputNumber className="!w-full" size="large" min={0} placeholder="可选" />
              </Form.Item>
              <Form.Item label="卖方/移交方报价（元/㎡·天）" name="initial_price">
                <InputNumber
                  className="!w-full"
                  size="large"
                  min={0}
                  step={0.1}
                  placeholder="可选"
                />
              </Form.Item>
            </div>

            <Form.Item label="优先级" name="priority">
              <Radio.Group size="large">
                <Radio.Button value="high">高</Radio.Button>
                <Radio.Button value="mid">中</Radio.Button>
                <Radio.Button value="low">低</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <div className="bg-blue-50/40 border border-blue-100 rounded-md p-3 mb-3 text-xs text-ink-700">
              <div className="font-semibold mb-1">提示</div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>提交后系统会基于业态自动加载对应模板（写字楼 50 项 / 商铺 30 项 / ...）</li>
                <li>必填项未填完不能入库；存在"不通过"项建议拒收</li>
                <li>跑完整套清单才能完成 → 自动入池</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => navigate('/due-diligence')}>取消</Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                onClick={handleStart}
                loading={submitting}
              >
                启动尽调
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}