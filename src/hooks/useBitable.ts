import { useState, useEffect, useCallback, useRef } from 'react';
import { bitable, FieldType, ITable } from '@lark-base-open/js-sdk';
import { AttachmentInfo, CachedUrls } from '../types';

export interface RecordItem {
  id: string;
  name: string;
  hasAttachment: boolean;
}

export function useBitable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [fieldName, setFieldName] = useState('Video Preview');
  
  const tableRef = useRef<ITable | null>(null);
  const urlCacheRef = useRef<CachedUrls>({});
  const attachmentFieldIdRef = useRef<string | null>(null);
  const URL_CACHE_DURATION = 8 * 60 * 1000;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      
      const tableList = await bitable.base.getTableList();
      if (tableList.length === 0) {
        setError('No tables found');
        setLoading(false);
        return;
      }
      
      let table: ITable | null = null;
      try {
        table = await bitable.base.getActiveTable();
      } catch {
        table = tableList[0];
      }
      
      if (!table) {
        setError('Cannot access table');
        setLoading(false);
        return;
      }
      
      tableRef.current = table;
      
      const fieldMetaList = await table.getFieldMetaList();
      
      const attachmentFields = fieldMetaList.filter(f => f.type === FieldType.Attachment);
      if (attachmentFields.length === 0) {
        setError('No attachment field found');
        setLoading(false);
        return;
      }
      
      const attachmentField = attachmentFields[0];
      attachmentFieldIdRef.current = attachmentField.id;
      setFieldName(attachmentField.name);
      
      const primaryField = fieldMetaList.find(f => f.isPrimary);
      const primaryFieldId = primaryField?.id;
      
      let recordIds: string[] = [];
      try {
        const view = await table.getActiveView();
        const idList = await view.getVisibleRecordIdList();
        recordIds = idList.filter((id): id is string => id !== undefined);
      } catch {
        const idList = await table.getRecordIdList();
        recordIds = idList.filter((id): id is string => id !== undefined);
      }
      
      if (recordIds.length === 0) {
        setError('No records found');
        setLoading(false);
        return;
      }
      
      const recordItems: RecordItem[] = [];
      
      for (const recordId of recordIds) {
        let name = '';
        let hasAttachment = false;
        
        if (primaryFieldId) {
          try {
            const val = await table.getCellValue(primaryFieldId, recordId);
            if (val && Array.isArray(val) && val.length > 0) {
              const first = val[0];
              if (first && typeof first === 'object' && 'text' in first) {
                name = String((first as {text?: string}).text || '');
              } else {
                name = String(first || '');
              }
            } else if (val) {
              name = String(val);
            }
          } catch {}
        }
        
        try {
          const attVal = await table.getCellValue(attachmentField.id, recordId);
          hasAttachment = !!(attVal && Array.isArray(attVal) && attVal.length > 0);
        } catch {}
        
        recordItems.push({ id: recordId, name, hasAttachment });
      }
      
      setRecords(recordItems);
      
      const firstWithAttachment = recordItems.find(r => r.hasAttachment);
      if (firstWithAttachment) {
        setSelectedRecordId(firstWithAttachment.id);
        await loadAttachments(table, firstWithAttachment.id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Init failed:', err);
      setError('Init failed: ' + String(err));
      setLoading(false);
    }
  };

  const loadAttachments = async (table: ITable, recordId: string) => {
    const fieldId = attachmentFieldIdRef.current;
    if (!fieldId) return;
    
    try {
      const cellValue = await table.getCellValue(fieldId, recordId);
      
      if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }

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

      const tokens = attachmentList.map(a => a.token);
      const urls = await getUrls(table, tokens, fieldId, recordId);
      setAttachmentUrls(urls);
    } catch (err) {
      console.error('Load attachments failed:', err);
      setAttachments([]);
      setAttachmentUrls(new Map());
    }
  };

  const getUrls = async (
    table: ITable, 
    tokens: string[], 
    fieldId: string, 
    recordId: string
  ): Promise<Map<string, string>> => {
    const now = Date.now();
    const urlMap = new Map<string, string>();
    const toFetch: string[] = [];

    tokens.forEach(token => {
      const cached = urlCacheRef.current[token];
      if (cached && cached.expireAt > now) {
        urlMap.set(token, cached.url);
      } else {
        toFetch.push(token);
      }
    });

    if (toFetch.length > 0) {
      try {
        const urls = await table.getCellAttachmentUrls(toFetch, fieldId, recordId);
        toFetch.forEach((token, i) => {
          const url = urls[i];
          if (url) {
            urlMap.set(token, url);
            urlCacheRef.current[token] = { url, expireAt: now + URL_CACHE_DURATION };
          }
        });
      } catch (err) {
        console.error('Get URL failed:', err);
      }
    }

    return urlMap;
  };

  const selectRecord = useCallback(async (recordId: string) => {
    if (!tableRef.current) return;
    setSelectedRecordId(recordId);
    await loadAttachments(tableRef.current, recordId);
  }, []);

  const refreshAttachmentUrl = useCallback(async (token: string): Promise<string | null> => {
    if (!tableRef.current || !selectedRecordId || !attachmentFieldIdRef.current) return null;
    
    try {
      const urls = await tableRef.current.getCellAttachmentUrls(
        [token], 
        attachmentFieldIdRef.current, 
        selectedRecordId
      );
      if (urls[0]) {
        urlCacheRef.current[token] = {
          url: urls[0],
          expireAt: Date.now() + URL_CACHE_DURATION
        };
        setAttachmentUrls(prev => new Map(prev).set(token, urls[0]));
        return urls[0];
      }
    } catch (err) {
      console.error('Refresh URL failed:', err);
    }
    return null;
  }, [selectedRecordId]);

  return {
    loading,
    error,
    records,
    selectedRecordId,
    attachments,
    attachmentUrls,
    fieldName,
    selectRecord,
    refreshAttachmentUrl
  };
}
