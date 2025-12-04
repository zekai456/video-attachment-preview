import { Select, Button, Typography } from '@douyinfe/semi-ui';

const { Title, Text } = Typography;

interface Option {
  value: string;
  label: string;
}

interface ConfigPanelProps {
  tables: Option[];
  views: Option[];
  fields: Option[];
  selectedTable: string;
  selectedView: string;
  selectedField: string;
  onTableChange: (value: string) => void;
  onViewChange: (value: string) => void;
  onFieldChange: (value: string) => void;
  onPreview: () => void;
  onSave: () => void;
}

export function ConfigPanel({
  tables,
  views,
  fields,
  selectedTable,
  selectedView,
  selectedField,
  onTableChange,
  onViewChange,
  onFieldChange,
  onPreview,
  onSave,
}: ConfigPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Title heading={5}>数据配置</Title>
      
      <div>
        <Text style={{ display: 'block', marginBottom: 8 }}>选择数据表</Text>
        <Select
          style={{ width: '100%' }}
          value={selectedTable}
          onChange={(value) => onTableChange(value as string)}
          optionList={tables}
          placeholder="请选择数据表"
          filter
        />
      </div>
      
      <div>
        <Text style={{ display: 'block', marginBottom: 8 }}>选择视图</Text>
        <Select
          style={{ width: '100%' }}
          value={selectedView}
          onChange={(value) => onViewChange(value as string)}
          optionList={views}
          placeholder="请选择视图"
          filter
          disabled={!selectedTable}
        />
      </div>
      
      <div>
        <Text style={{ display: 'block', marginBottom: 8 }}>选择视频字段</Text>
        <Select
          style={{ width: '100%' }}
          value={selectedField}
          onChange={(value) => onFieldChange(value as string)}
          optionList={fields}
          placeholder="请选择附件字段"
          filter
          disabled={!selectedTable}
        />
      </div>
      
      <Button
        theme="light"
        onClick={onPreview}
        disabled={!selectedTable || !selectedView || !selectedField}
        block
      >
        预览数据
      </Button>
      
      <div style={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        right: 16 
      }}>
        <Button
          theme="solid"
          type="primary"
          onClick={onSave}
          disabled={!selectedTable || !selectedView || !selectedField}
          block
        >
          确认
        </Button>
      </div>
    </div>
  );
}
