import { useEffect, useState, useCallback } from 'react';
import { dashboard, bitable, FieldType, IConfig as SDKConfig, IDataCondition } from '@lark-base-open/js-sdk';
import { Spin } from '@douyinfe/semi-ui';
import { ConfigPanel } from './components/ConfigPanel';
import { ViewPanel, RecordData, FieldInfo } from './components/ViewPanel';

// 仪表盘状态枚举
enum DashboardState {
  Create = 'Create',
  Config = 'Config',
  View = 'View',
  FullScreen = 'FullScreen',
}

// 自定义配置接口
interface ICustomConfig {
  tableId: string;
  viewId: string;
  attachmentFieldId: string;
  filterFieldId: string;
  title: string;
}

// 选项类型
interface Option {
  value: string;
  label: string;
}

// 附件类型
interface AttachmentItem {
  token: string;
  name: string;
  type?: string;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DashboardState>(DashboardState.Config);
  
  // 配置相关
  const [tables, setTables] = useState<Option[]>([]);
  const [views, setViews] = useState<Option[]>([]);
  const [attachmentFields, setAttachmentFields] = useState<Option[]>([]);
  const [allFields, setAllFields] = useState<Option[]>([]);
  const [fieldInfos, setFieldInfos] = useState<FieldInfo[]>([]);
  
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedView, setSelectedView] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterField, setFilterField] = useState<string>('');
  const [title, setTitle] = useState<string>('视频预览');
  
  // 数据相关
  const [records, setRecords] = useState<RecordData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // 初始化
  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      setLoading(true);
      
      // 获取仪表盘状态
      const currentState = dashboard.state as DashboardState;
      console.log('Dashboard state:', currentState);
      
      // 默认进入配置状态，除非明确是展示状态
      if (currentState === DashboardState.View || currentState === DashboardState.FullScreen) {
        setState(currentState);
      } else {
        setState(DashboardState.Config);
      }
      
      // 获取所有表
      const tableList = await bitable.base.getTableList();
      const tableOptions: Option[] = [];
      for (const table of tableList) {
        const name = await table.getName();
        tableOptions.push({ value: table.id, label: name });
      }
      setTables(tableOptions);
      
      // 尝试读取已保存的配置
      if (currentState !== DashboardState.Create) {
        try {
          const config = await dashboard.getConfig();
          const customConfig = config?.customConfig as ICustomConfig | undefined;
          if (customConfig) {
            const { tableId, viewId, attachmentFieldId, filterFieldId, title: savedTitle } = customConfig;
            if (tableId) {
              setSelectedTable(tableId);
              await loadTableData(tableId);
              
              if (viewId) setSelectedView(viewId);
              if (attachmentFieldId) setSelectedField(attachmentFieldId);
              if (filterFieldId) setFilterField(filterFieldId);
              if (savedTitle) setTitle(savedTitle);
              
              // 加载记录数据
              if (viewId && attachmentFieldId) {
                await loadRecords(tableId, viewId, attachmentFieldId, filterFieldId);
              }
            }
          }
        } catch (e) {
          console.log('No saved config, auto select first table');
        }
      }
      
      // 如果没有选择表，自动选择第一个
      if (!selectedTable && tableOptions.length > 0) {
        await handleTableChange(tableOptions[0].value);
      }
      
      // 监听配置变化
      dashboard.onConfigChange(async (event: { data: SDKConfig }) => {
        const customConfig = event.data?.customConfig as ICustomConfig | undefined;
        if (customConfig) {
          const { tableId, viewId, attachmentFieldId, filterFieldId } = customConfig;
          if (tableId && viewId && attachmentFieldId) {
            await loadRecords(tableId, viewId, attachmentFieldId, filterFieldId);
          }
        }
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Init failed:', err);
      setLoading(false);
    }
  };

  const loadTableData = async (tableId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      
      // 加载视图
      const viewList = await table.getViewMetaList();
      const viewOptions: Option[] = viewList.map((v: { id: string; name: string }) => ({
        value: v.id,
        label: v.name,
      }));
      setViews(viewOptions);
      
      // 加载所有字段
      const fieldList = await table.getFieldMetaList();
      
      // 附件字段
      const attFieldOptions: Option[] = fieldList
        .filter((f: { type: FieldType }) => f.type === FieldType.Attachment)
        .map((f: { id: string; name: string }) => ({
          value: f.id,
          label: f.name,
        }));
      setAttachmentFields(attFieldOptions);
      
      // 所有字段（用于筛选和显示）
      setAllFields(fieldList.map((f: { id: string; name: string }) => ({
        value: f.id,
        label: f.name,
      })));
      
      // 字段信息（用于表格显示）
      setFieldInfos(fieldList.map((f: { id: string; name: string; type: number }) => ({
        id: f.id,
        name: f.name,
        type: f.type,
      })));
      
      return { viewOptions, attFieldOptions };
    } catch (e) {
      console.error('Load table data failed:', e);
      return { viewOptions: [] as Option[], attFieldOptions: [] as Option[] };
    }
  };

  const loadRecords = async (tableId: string, viewId: string, attachmentFieldId: string, filterFieldId?: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const view = await table.getViewById(viewId);
      const recordIdList = await view.getVisibleRecordIdList();
      
      const fieldMeta = await table.getFieldMetaList();
      const displayFields = fieldMeta.slice(0, 5); // 显示前5个字段
      
      const recordList: RecordData[] = [];
      
      for (const recordId of recordIdList) {
        if (!recordId) continue;
        
        // 获取各字段的值
        const values: Record<string, string | null> = {};
        
        for (const field of displayFields) {
          try {
            const val = await table.getCellValue(field.id, recordId);
            if (val === null || val === undefined) {
              values[field.id] = null;
            } else if (Array.isArray(val)) {
              if (val.length === 0) {
                values[field.id] = null;
              } else {
                const first = val[0] as { text?: string; name?: string } | string;
                if (typeof first === 'object' && first !== null) {
                  values[field.id] = first.text || first.name || JSON.stringify(first);
                } else {
                  values[field.id] = String(first);
                }
              }
            } else {
              values[field.id] = String(val);
            }
          } catch {
            values[field.id] = null;
          }
        }
        
        // 检查筛选条件
        if (filterFieldId) {
          const filterValue = values[filterFieldId];
          if (filterValue === '审核通过') {
            continue; // 跳过审核通过的记录
          }
        }
        
        // 检查是否有视频附件
        const attVal = await table.getCellValue(attachmentFieldId, recordId);
        let hasVideo = false;
        if (attVal && Array.isArray(attVal) && attVal.length > 0) {
          hasVideo = attVal.some((item) => {
            const att = item as AttachmentItem;
            const type = att.type || '';
            const fileName = att.name || '';
            return type.startsWith('video/') || 
                   /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);
          });
        }
        
        recordList.push({ id: recordId, values, hasVideo });
      }
      
      setRecords(recordList);
      
      // 自动选择第一条有视频的记录
      const firstVideo = recordList.find(r => r.hasVideo);
      if (firstVideo) {
        await handleRecordSelect(tableId, attachmentFieldId, firstVideo.id);
      } else {
        setSelectedRecord('');
        setVideoUrl('');
      }
    } catch (e) {
      console.error('Load records failed:', e);
    }
  };

  const handleTableChange = async (tableId: string) => {
    setSelectedTable(tableId);
    setSelectedView('');
    setSelectedField('');
    setFilterField('');
    setRecords([]);
    setVideoUrl('');
    
    const { viewOptions, attFieldOptions } = await loadTableData(tableId);
    
    // 自动选择第一个视图和附件字段
    if (viewOptions.length > 0) {
      setSelectedView(viewOptions[0].value);
    }
    if (attFieldOptions.length > 0) {
      setSelectedField(attFieldOptions[0].value);
    }
  };

  const handleViewChange = (viewId: string) => {
    setSelectedView(viewId);
  };

  const handleFieldChange = (fieldId: string) => {
    setSelectedField(fieldId);
  };

  const handleFilterFieldChange = (fieldId: string) => {
    setFilterField(fieldId);
  };

  const handleRecordSelect = useCallback(async (tableId: string, fieldId: string, recordId: string) => {
    setSelectedRecord(recordId);
    
    try {
      const table = await bitable.base.getTableById(tableId);
      const attVal = await table.getCellValue(fieldId, recordId);
      
      if (attVal && Array.isArray(attVal) && attVal.length > 0) {
        // 找到视频附件
        const videoAtt = attVal.find((item) => {
          const att = item as AttachmentItem;
          const type = att.type || '';
          const fileName = att.name || '';
          return type.startsWith('video/') || 
                 /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);
        });
        
        if (videoAtt) {
          const token = (videoAtt as AttachmentItem).token;
          const urls = await table.getCellAttachmentUrls([token], fieldId, recordId);
          if (urls[0]) {
            setVideoUrl(urls[0]);
          }
        }
      }
    } catch (e) {
      console.error('Get video URL failed:', e);
    }
  }, []);

  const handleSaveConfig = async () => {
    try {
      const dataConditions: IDataCondition[] = [{
        tableId: selectedTable,
      }];
      
      const config: SDKConfig = {
        dataConditions,
        customConfig: {
          tableId: selectedTable,
          viewId: selectedView,
          attachmentFieldId: selectedField,
          filterFieldId: filterField,
          title,
        },
      };
      await dashboard.saveConfig(config);
    } catch (e) {
      console.error('Save config failed:', e);
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handlePreview = async () => {
    if (selectedTable && selectedView && selectedField) {
      await loadRecords(selectedTable, selectedView, selectedField, filterField);
    }
  };

  // 获取筛选字段名称
  const filterFieldName = filterField 
    ? allFields.find((f: Option) => f.value === filterField)?.label 
    : '';

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  // 配置状态 - 显示配置面板
  const isConfigMode = state === DashboardState.Create || state === DashboardState.Config;
  
  if (isConfigMode) {
    return (
      <div className="dashboard-container">
        <div className="preview-area">
          <ViewPanel
            records={records}
            fields={fieldInfos}
            selectedRecord={selectedRecord}
            videoUrl={videoUrl}
            onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
            filterFieldId={filterField}
            filterFieldName={filterFieldName}
          />
        </div>
        <div className="config-panel">
          <ConfigPanel
            tables={tables}
            views={views}
            fields={attachmentFields}
            allFields={allFields}
            selectedTable={selectedTable}
            selectedView={selectedView}
            selectedField={selectedField}
            filterField={filterField}
            title={title}
            onTableChange={handleTableChange}
            onViewChange={handleViewChange}
            onFieldChange={handleFieldChange}
            onFilterFieldChange={handleFilterFieldChange}
            onTitleChange={handleTitleChange}
            onPreview={handlePreview}
            onSave={handleSaveConfig}
          />
        </div>
      </div>
    );
  }

  // 展示状态
  return (
    <ViewPanel
      records={records}
      fields={fieldInfos}
      selectedRecord={selectedRecord}
      videoUrl={videoUrl}
      onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
      filterFieldId={filterField}
      filterFieldName={filterFieldName}
      fullWidth
    />
  );
}

export default App;
