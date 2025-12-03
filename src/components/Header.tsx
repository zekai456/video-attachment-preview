import { Video } from 'lucide-react';

interface HeaderProps {
  fieldName: string;
  attachmentCount: number;
}

export function Header({ fieldName, attachmentCount }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Video className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-base font-semibold text-gray-800">{fieldName}</h1>
      </div>
      
      {attachmentCount > 0 && (
        <div className="px-3 py-1 rounded-full bg-blue-50 text-sm font-medium text-blue-600">
          {attachmentCount} 个附件
        </div>
      )}
    </header>
  );
}
