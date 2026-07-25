import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Steps,
  InputNumber,
  Radio,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
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
  { value: 'office', label: '写字楼' },
  { value: 'retail', label: '商铺' },
  { value: 'hotel', label: '酒店' },
  { value: 'apartment', label: '公寓' },
  { value: 'warehouse', label: '仓库' },
  { value: 'plant', label: '厂房' },
];

/**
 * 新建尽调（/due-diligence/new）
 *  - 3 步：选业态 → 基本信息 → 启动
 *  - 启动后跳到流程页 /due-diligence/:id
 */
export default function DueDiligenceNewPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const intakeAssets = useAssetStore((s) => s.intakeAssets);
  const setIntakeStatus = useAssetStore((s) => s.setIntakeStatus);

  const handleNext = async () => {
    try {
      await form.validateFields();
      setStep((s) => s + 1);
    } catch {
      message.error('请先填写必填项');
    }
  };

  const handleStart = () => {
    const values = form.getFieldsValue();
    // 生成新 ID
    const id = `RT-INT-2026-${String(intakeAssets.length + 100).padStart(3, '0')}`;
    const tpl = getTemplateForType(values.type);

    // 用 store 的 setState 直接添加
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

    message.success(`已创建尽调任务 ${id}`);
    setTimeout(() => navigate(`/due-diligence/${id}`), 500);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/due-diligence')}>
          返回工作台
        </Button>
        <h2 className="text-lg font-semibold m-0">新建尽调</h2>
      </div>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Card>
          <Steps
            current={step}
            items={[
              { title: '选择业态' },
              { title: '基本信息' },
              { title: '启动尽调' },
            ]}
            className="!mb-6"
          />

          <Form form={form} layout="vertical" initialValues={{ source: 'military_transfer', priority: 'mid' }}>
            {step === 0 && (
              <div className="space-y-3">
                <Form.Item label="业态" name="type" rules={[{ required: true, message: '请选择业态' }]}>
                  <Radio.Group className="w-full" buttonStyle="solid">
                    <div className="grid grid-cols-3 gap-2">
                      {TYPE_OPTIONS.map((o) => (
                        <Radio.Button key={o.value} value={o.value} className="!text-center">
                          {o.label}
                        </Radio.Button>
                      ))}
                    </div>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="资产来源" name="source" rules={[{ required: true }]}>
                  <Select
                    options={SOURCE_OPTIONS.map((o) => ({
                      value: o.value,
                      label: `${o.label}${o.description ? ' · ' + o.description : ''}`,
                    }))}
                  />
                </Form.Item>
                <div className="text-right">
                  <Button type="primary" onClick={handleNext} icon={<ArrowRightOutlined />}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Form.Item label="资产名（暂用）" name="name" rules={[{ required: true }]}>
                  <Input placeholder="如：朝阳 CBD 写字楼 A 座" />
                </Form.Item>
                <Form.Item label="区域" name="region" rules={[{ required: true }]}>
                  <Input placeholder="如：朝阳区" />
                </Form.Item>
                <Form.Item label="地址（选填）" name="address">
                  <Input placeholder="详细地址" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-3">
                  <Form.Item label="面积（㎡）" name="area">
                    <InputNumber className="!w-full" min={0} />
                  </Form.Item>
                  <Form.Item label="卖方/移交方报价（元/㎡·天）" name="initial_price">
                    <InputNumber className="!w-full" min={0} step={0.1} />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Form.Item label="优先级" name="priority">
                    <Radio.Group>
                      <Radio.Button value="high">高</Radio.Button>
                      <Radio.Button value="mid">中</Radio.Button>
                      <Radio.Button value="low">低</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="尽调截止日" name="due_date">
                    <Input type="date" />
                  </Form.Item>
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(0)}>上一步</Button>
                  <Button type="primary" onClick={handleNext} icon={<ArrowRightOutlined />}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Card type="inner" className="!bg-ink-50">
                  <div className="text-sm space-y-1">
                    <div>
                      业态：<b>{form.getFieldValue('type')}</b>
                    </div>
                    <div>
                      资产名：<b>{form.getFieldValue('name')}</b>
                    </div>
                    <div>
                      区域：<b>{form.getFieldValue('region')}</b>
                    </div>
                    {form.getFieldValue('area') && (
                      <div>
                        面积：<b>{form.getFieldValue('area').toLocaleString()} ㎡</b>
                      </div>
                    )}
                    {form.getFieldValue('initial_price') && (
                      <div>
                        卖方报价：<b>¥{form.getFieldValue('initial_price')}/㎡·天</b>
                      </div>
                    )}
                  </div>
                </Card>
                <div className="text-xs text-ink-500">
                  启动后系统会基于业态自动加载对应模板（写字楼 50 项 / 商铺 30 项 / ...），逐项现场勾选。
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(1)}>上一步</Button>
                  <Button
                    type="primary"
                    onClick={handleStart}
                    icon={<CheckOutlined />}
                  >
                    启动尽调
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </Card>
      </div>
    </div>
  );
}