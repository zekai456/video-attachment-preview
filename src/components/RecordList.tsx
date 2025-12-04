import { Play, FileVideo } from 'lucide-react';

interface RecordItem {
  id: string;
  name: string;
  hasAttachment: boolean;
}

interface RecordListProps {
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RecordList({ records, selectedId, onSelect }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No records
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {records.map((record, index) => (
        <div
          key={record.id}
          onClick={() => onSelect(record.id)}
          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 transition-colors
            ${selectedId === record.id 
              ? 'bg-blue-50 border-l-2 border-l-blue-500' 
              : 'hover:bg-gray-50 border-l-2 border-l-transparent'
            }`}
        >
          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0
            ${record.hasAttachment ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {record.hasAttachment ? (
              <FileVideo className="w-3.5 h-3.5" />
            ) : (
              <span className="text-xs">{index + 1}</span>
            )}
          </div>
          
          <span className={`flex-1 text-sm truncate
            ${selectedId === record.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
            {record.name || `Record ${index + 1}`}
          </span>
          
          {record.hasAttachment && selectedId === record.id && (
            <Play className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
