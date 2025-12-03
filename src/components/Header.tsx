import { Video, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeaderProps {
  fieldName: string;
  attachmentCount: number;
  isDashboard?: boolean;
  currentIndex?: number;
  totalRecords?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function Header({ 
  fieldName, 
  attachmentCount,
  isDashboard = false,
  currentIndex = 0,
  totalRecords = 0,
  onPrev,
  onNext
}: HeaderProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalRecords - 1;

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Video className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-base font-semibold text-gray-800">{fieldName}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {attachmentCount > 0 && (
          <div className="px-3 py-1 rounded-full bg-blue-50 text-sm font-medium text-blue-600">
            {attachmentCount} 个附件
          </div>
        )}
        
        {isDashboard && totalRecords > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!canGoPrev}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                ${canGoPrev 
                  ? 'hover:bg-gray-100 text-gray-600 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-2 py-0.5 text-xs font-medium text-gray-500">
              {currentIndex + 1}/{totalRecords}
            </div>
            
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                ${canGoNext 
                  ? 'hover:bg-gray-100 text-gray-600 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
