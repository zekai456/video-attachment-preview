import { useState, useEffect, useCallback, useRef } from 'react';
import { bitable, FieldType, ITable } from '@lark-base-open/js-sdk';
import { AttachmentInfo, CachedUrls } from '../types';

interface Selection {
  tableId: string | null;
  viewId: string | null;
  fieldId: string | null;
  recordId: string | null;
}

interface UseBitableResult {
  loading: boolean;
  error: string | null;
  attachments: AttachmentInfo[];
  attachmentUrls: Map<string, string>;
  fieldName: string;
  refreshAttachmentUrl: (token: string) => Promise<string | null>;
}

export function useBitable(): UseBitableResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [fieldName, setFieldName] = useState<string>('附件预览');
  
  const tableRef = useRef<ITable | null>(null);
  const currentSelectionRef = useRef<{ fieldId: string; recordId: string } | null>(null);
  const urlCacheRef = useRef<CachedUrls>({});
  const attachmentFieldIdsRef = useRef<Set<string>>(new Set());
  const URL_CACHE_DURATION = 8 * 60 * 1000;

  // 初始化
  useEffect(() => {
    initBitable();
    
    const off = bitable.base.onSelectionChange(handleSelectionChange);
    return () => off();
  }, []);

  const initBitable = async () => {
    try {
      setLoading(true);
      const table = await bitable.base.getActiveTable();
      tableRef.current = table;
      
      // 获取所有附件字段的ID
      const fieldMetaList = await table.getFieldMetaList();
      const attachmentFieldIds = fieldMetaList
        .filter(field => field.type === FieldType.Attachment)
        .map(field => field.id);
      
      if (attachmentFieldIds.length === 0) {
        setError('当前表格没有附件字段');
        setLoading(false);
        return;
      }
      
      attachmentFieldIdsRef.current = new Set(attachmentFieldIds);

      // 获取当前选中
      const selection = await bitable.base.getSelection();
      if (selection.fieldId && selection.recordId) {
        await loadCellAttachments(table, selection.fieldId, selection.recordId);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('初始化失败:', err);
      setError('初始化失败，请刷新重试');
      setLoading(false);
    }
  };

  const handleSelectionChange = async (event: { data: Selection }) => {
    const { fieldId, recordId } = event.data;
    if (!fieldId || !recordId || !tableRef.current) return;
    
    await loadCellAttachments(tableRef.current, fieldId, recordId);
  };

  const loadCellAttachments = async (table: ITable, fieldId: string, recordId: string) => {
    try {
      // 保存当前选中
      currentSelectionRef.current = { fieldId, recordId };
      
      // 获取字段信息
      const fieldMeta = await table.getFieldMetaById(fieldId);
      
      // 检查是否是附件字段
      if (fieldMeta.type !== FieldType.Attachment) {
        // 不是附件字段，尝试查找该记录中的第一个有附件的字段
        const attachmentFieldIds = Array.from(attachmentFieldIdsRef.current);
        
        for (const attFieldId of attachmentFieldIds) {
          const cellValue = await table.getCellValue(attFieldId, recordId);
          if (cellValue && Array.isArray(cellValue) && cellValue.length > 0) {
            const attFieldMeta = await table.getFieldMetaById(attFieldId);
            setFieldName(attFieldMeta.name);
            currentSelectionRef.current = { fieldId: attFieldId, recordId };
            await processAttachments(table, attFieldId, recordId, cellValue);
            return;
          }
        }
        
        // 该记录没有任何附件
        setFieldName('附件预览');
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }
      
      // 是附件字段
      setFieldName(fieldMeta.name);
      const cellValue = await table.getCellValue(fieldId, recordId);
      
      if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }

      await processAttachments(table, fieldId, recordId, cellValue);
    } catch (err) {
      console.error('加载附件失败:', err);
      setAttachments([]);
      setAttachmentUrls(new Map());
    }
  };

  const processAttachments = async (
    table: ITable, 
    fieldId: string, 
    recordId: string, 
    cellValue: unknown[]
  ) => {
    const attachmentList: AttachmentInfo[] = cellValue.map((item: unknown) => {
      const att = item as { token: string; name: string; size?: number; type?: string; timeStamp?: number };
      return {
        token: att.token,
        name: att.name,
        size: att.size || 0,
        type: att.type || '',
        timeStamp: att.timeStamp || Date.now()
      };
    });
    
    setAttachments(attachmentList);

    // 批量获取附件URL
    const tokens = attachmentList.map(a => a.token);
    const urls = await getAttachmentUrls(table, tokens, fieldId, recordId);
    setAttachmentUrls(urls);
  };

  const getAttachmentUrls = async (
    table: ITable, 
    tokens: string[], 
    fieldId: string, 
    recordId: string
  ): Promise<Map<string, string>> => {
    const now = Date.now();
    const urlMap = new Map<string, string>();
    const tokensToFetch: string[] = [];

    tokens.forEach(token => {
      const cached = urlCacheRef.current[token];
      if (cached && cached.expireAt > now) {
        urlMap.set(token, cached.url);
      } else {
        tokensToFetch.push(token);
      }
    });

    if (tokensToFetch.length > 0) {
      try {
        const urls = await table.getCellAttachmentUrls(tokensToFetch, fieldId, recordId);
        tokensToFetch.forEach((token, index) => {
          const url = urls[index];
          if (url) {
            urlMap.set(token, url);
            urlCacheRef.current[token] = {
              url,
              expireAt: now + URL_CACHE_DURATION
            };
          }
        });
      } catch (err) {
        console.error('获取附件URL失败:', err);
      }
    }

    return urlMap;
  };

  const refreshAttachmentUrl = useCallback(async (token: string): Promise<string | null> => {
    if (!tableRef.current || !currentSelectionRef.current) return null;
    
    const { fieldId, recordId } = currentSelectionRef.current;
    
    try {
      const urls = await tableRef.current.getCellAttachmentUrls([token], fieldId, recordId);
      if (urls[0]) {
        urlCacheRef.current[token] = {
          url: urls[0],
          expireAt: Date.now() + URL_CACHE_DURATION
        };
        setAttachmentUrls(prev => new Map(prev).set(token, urls[0]));
        return urls[0];
      }
    } catch (err) {
      console.error('刷新URL失败:', err);
    }
    return null;
  }, []);

  return {
    loading,
    error,
    attachments,
    attachmentUrls,
    fieldName,
    refreshAttachmentUrl
  };
}
