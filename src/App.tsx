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
  visibleFieldIds: string[];
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
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
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
            const { tableId, viewId, attachmentFieldId, filterFieldId, visibleFieldIds, title: savedTitle } = customConfig;
            if (tableId) {
              setSelectedTable(tableId);
              await loadTableData(tableId);
              
              if (viewId) setSelectedView(viewId);
              if (attachmentFieldId) setSelectedField(attachmentFieldId);
              if (filterFieldId) setFilterField(filterFieldId);
              if (visibleFieldIds) setVisibleFields(visibleFieldIds);
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
      console.log('Loading records...', { tableId, viewId, attachmentFieldId, filterFieldId });
      const table = await bitable.base.getTableById(tableId);
      const view = await table.getViewById(viewId);
      const recordIdList = await view.getVisibleRecordIdList();
      
      const fieldMeta = await table.getFieldMetaList();
      console.log('Field meta:', fieldMeta);
      
      // 过滤掉不支持 getCellValue 的字段类型
      // 18=按钮, 20=公式, 23=查找引用, 1001=创建时间, 1002=修改时间, 1003=创建人, 1004=修改人
      const unsupportedTypes = [18, 20, 23, 1001, 1002, 1003, 1004];
      const supportedFields = fieldMeta.filter(f => !unsupportedTypes.includes(f.type));
      console.log('Supported fields:', supportedFields.length);
      
      const recordList: RecordData[] = [];
      
      for (const recordId of recordIdList) {
        if (!recordId) continue;
        
        // 获取支持的字段的值
        const values: Record<string, string | null> = {};
        
        for (const field of supportedFields) {
          try {
            const val = await table.getCellValue(field.id, recordId);
            if (val === null || val === undefined) {
              values[field.id] = null;
            } else if (Array.isArray(val)) {
              if (val.length === 0) {
                values[field.id] = null;
              } else {
                const first = val[0] as { text?: string; name?: string; id?: string } | string;
                if (typeof first === 'object' && first !== null) {
                  // 优先使用 text，然后是 name
                  values[field.id] = first.text || first.name || JSON.stringify(first);
                } else {
                  values[field.id] = String(first);
                }
              }
            } else if (typeof val === 'object' && val !== null) {
              // 单选字段可能直接返回对象 { id, text }
              const obj = val as { text?: string; name?: string };
              values[field.id] = obj.text || obj.name || JSON.stringify(val);
            } else {
              values[field.id] = String(val);
            }
          } catch (e) {
            console.warn(`Skip field ${field.id} (type ${field.type}):`, e);
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
          visibleFieldIds: visibleFields,
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

  const handleVisibleFieldsChange = (values: string[]) => {
    setVisibleFields(values);
  };

  // 单元格编辑
  const handleCellEdit = useCallback(async (recordId: string, fieldId: string, value: string) => {
    try {
      console.log('Editing cell:', { recordId, fieldId, value });
      const table = await bitable.base.getTableById(selectedTable);
      
      // 获取字段元数据来确定类型
      const fieldMeta = fieldInfos.find(f => f.id === fieldId);
      const fieldType = fieldMeta?.type;
      console.log('Field type:', fieldType);
      
      let cellValue: unknown;
      
      // FieldType: 1=Text, 3=SingleSelect, 4=MultiSelect, 11=SingleLink, ...
      if (fieldType === 3) {
        // 单选字段 - 先获取选项列表找到对应的选项 ID
        const field = await table.getFieldById(fieldId);
        const options = await (field as { getOptions?: () => Promise<{id: string; name: string}[]> }).getOptions?.();
        console.log('Single select options:', options);
        
        if (options) {
          const option = options.find((o: {id: string; name: string}) => o.name === value);
          if (option) {
            cellValue = option.id;
          } else {
            console.warn('Option not found for value:', value);
            cellValue = value;
          }
        } else {
          cellValue = value;
        }
      } else if (fieldType === 1) {
        // 文本字段 - 使用段落格式
        cellValue = [{ type: 'text', text: value }];
      } else {
        cellValue = value;
      }
      
      console.log('Setting cell value:', cellValue);
      await table.setCellValue(fieldId, recordId, cellValue as never);
      
      // 更新本地数据
      setRecords(prev => prev.map(r => {
        if (r.id === recordId) {
          return { ...r, values: { ...r.values, [fieldId]: value } };
        }
        return r;
      }));
      
      console.log('Cell edit success');
    } catch (e) {
      console.error('Edit cell failed:', e);
      throw e;
    }
  }, [selectedTable, fieldInfos]);

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
            visibleFieldIds={visibleFields}
            selectedRecord={selectedRecord}
            videoUrl={videoUrl}
            onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
            onCellEdit={handleCellEdit}
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
            visibleFields={visibleFields}
            title={title}
            onTableChange={handleTableChange}
            onViewChange={handleViewChange}
            onFieldChange={handleFieldChange}
            onFilterFieldChange={handleFilterFieldChange}
            onVisibleFieldsChange={handleVisibleFieldsChange}
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
      visibleFieldIds={visibleFields}
      selectedRecord={selectedRecord}
      videoUrl={videoUrl}
      onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
      onCellEdit={handleCellEdit}
      filterFieldId={filterField}
      filterFieldName={filterFieldName}
      fullWidth
    />
  );
}

export default App;
