import { Video } from 'lucide-react';
import { PreviewArea } from './components/PreviewArea';
import { EmptyState } from './components/EmptyState';
import { RecordList } from './components/RecordList';
import { useBitable } from './hooks/useBitable';

function App() {
  const {
    loading,
    error,
    records,
    selectedRecordId,
    attachments,
    attachmentUrls,
    fieldName,
    selectRecord,
    refreshAttachmentUrl
  } = useBitable();

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <EmptyState type="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <EmptyState type="error" message={error} />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* Left Panel - Record List */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-3 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">{fieldName}</h1>
              <p className="text-xs text-gray-500">{records.length} records</p>
            </div>
          </div>
        </div>
        
        <RecordList
          records={records}
          selectedId={selectedRecordId}
          onSelect={selectRecord}
        />
      </div>
      
      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRecordId && attachments.length > 0 ? (
          <PreviewArea
            attachments={attachments}
            attachmentUrls={attachmentUrls}
            onRefreshUrl={refreshAttachmentUrl}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a record with video</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
