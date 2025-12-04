import { Table, Typography } from '@douyinfe/semi-ui';
import { IconVideo } from '@douyinfe/semi-icons';

const { Text } = Typography;

interface RecordItem {
  id: string;
  name: string;
  hasVideo: boolean;
}

interface ViewPanelProps {
  records: RecordItem[];
  selectedRecord: string;
  videoUrl: string;
  onRecordSelect: (id: string) => void;
  fullWidth?: boolean;
}

export function ViewPanel({
  records,
  selectedRecord,
  videoUrl,
  onRecordSelect,
  fullWidth = false,
}: ViewPanelProps) {
  const columns = [
    {
      title: '',
      dataIndex: 'hasVideo',
      width: 40,
      render: (hasVideo: boolean) => (
        <IconVideo style={{ 
          color: hasVideo ? 'var(--semi-color-primary)' : 'var(--semi-color-text-3)',
          opacity: hasVideo ? 1 : 0.3 
        }} />
      ),
    },
    {
      title: '记录名称',
      dataIndex: 'name',
      render: (text: string) => (
        <Text ellipsis={{ showTooltip: true }} style={{ width: '100%' }}>
          {text}
        </Text>
      ),
    },
  ];

  const containerStyle = fullWidth 
    ? { display: 'flex', height: '100%', width: '100%' }
    : { display: 'flex', height: '100%', width: '100%' };

  return (
    <div style={containerStyle}>
      {/* 左侧表格 */}
      <div style={{ 
        width: fullWidth ? '40%' : '50%', 
        minWidth: 200,
        borderRight: '1px solid var(--semi-color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => onRecordSelect(record?.id || ''),
            style: {
              cursor: 'pointer',
              backgroundColor: record?.id === selectedRecord 
                ? 'var(--semi-color-primary-light-default)' 
                : undefined,
            },
          })}
          style={{ flex: 1 }}
          scroll={{ y: '100%' }}
          empty={
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
              暂无数据
            </div>
          }
        />
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
