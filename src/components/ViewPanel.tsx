import { Table, Typography, Tag } from '@douyinfe/semi-ui';
import { IconVideo } from '@douyinfe/semi-icons';

const { Text } = Typography;

// 记录数据结构
export interface RecordData {
  id: string;
  values: Record<string, string | null>;
  hasVideo: boolean;
}

// 字段信息
export interface FieldInfo {
  id: string;
  name: string;
  type: number;
}

interface ViewPanelProps {
  records: RecordData[];
  fields: FieldInfo[];
  selectedRecord: string;
  videoUrl: string;
  onRecordSelect: (id: string) => void;
  fullWidth?: boolean;
  filterFieldId?: string;
  filterFieldName?: string;
}

export function ViewPanel({
  records,
  fields,
  selectedRecord,
  videoUrl,
  onRecordSelect,
  fullWidth = false,
  filterFieldId,
  filterFieldName,
}: ViewPanelProps) {
  // 动态生成表格列
  const columns = [
    {
      title: '',
      dataIndex: 'hasVideo',
      width: 36,
      render: (hasVideo: boolean) => (
        <IconVideo style={{ 
          color: hasVideo ? 'var(--semi-color-primary)' : 'var(--semi-color-text-3)',
          opacity: hasVideo ? 1 : 0.3 
        }} />
      ),
    },
    // 显示前几个字段
    ...fields.slice(0, 4).map((field) => ({
      title: field.name,
      dataIndex: `field_${field.id}`,
      width: field.id === filterFieldId ? 120 : undefined,
      ellipsis: true,
      render: (_: unknown, record: RecordData) => {
        const value = record.values[field.id] || '-';
        // 如果是筛选字段，用标签显示
        if (field.id === filterFieldId && value !== '-') {
          const isPass = value === '审核通过';
          return (
            <Tag 
              color={isPass ? 'green' : 'orange'}
              size="small"
            >
              {value}
            </Tag>
          );
        }
        return (
          <Text ellipsis={{ showTooltip: true }} style={{ maxWidth: 150 }}>
            {value}
          </Text>
        );
      },
    })),
  ];

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 左侧表格 */}
      <div style={{ 
        width: fullWidth ? '45%' : '55%', 
        minWidth: 300,
        borderRight: '1px solid var(--semi-color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--semi-color-bg-0)',
      }}>
        {/* 表头信息 */}
        <div style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text strong>记录列表</Text>
          <Text type="tertiary" size="small">
            {records.length} 条记录
            {filterFieldName && ` · 筛选: ${filterFieldName} ≠ 审核通过`}
          </Text>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => record && onRecordSelect(record.id),
              style: {
                cursor: 'pointer',
                backgroundColor: record?.id === selectedRecord 
                  ? 'var(--semi-color-primary-light-default)' 
                  : undefined,
              },
            })}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                暂无数据
              </div>
            }
          />
        </div>
      </div>
      
      {/* 右侧视频预览 */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        minHeight: 200,
      }}>
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}>
            <IconVideo size="extra-large" />
            <Text style={{ marginTop: 16, color: 'inherit' }}>
              {records.length > 0 ? '请选择一条记录预览视频' : '暂无视频数据'}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
