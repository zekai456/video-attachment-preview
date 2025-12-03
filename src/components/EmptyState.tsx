import { Paperclip, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-attachment' | 'no-field' | 'loading' | 'error';
  message?: string;
}

export function EmptyState({ type, message }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case 'loading':
        return (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </>
        );
      case 'no-field':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">未找到附件字段</p>
            <p className="text-gray-400 text-sm">请确保表格中包含附件类型的字段</p>
          </>
        );
      case 'error':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Paperclip className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">加载失败</p>
            <p className="text-gray-400 text-sm">{message || '请刷新页面重试'}</p>
          </>
        );
      case 'no-attachment':
      default:
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Paperclip className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium mb-1">此单元格没有附件</p>
            <p className="text-gray-400 text-sm">请选择包含附件的单元格</p>
          </>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fadeIn">
      {getContent()}
    </div>
  );
}
