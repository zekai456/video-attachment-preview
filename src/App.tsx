import { Header } from './components/Header';
import { PreviewArea } from './components/PreviewArea';
import { EmptyState } from './components/EmptyState';
import { useBitable } from './hooks/useBitable';

function App() {
  const {
    loading,
    error,
    attachments,
    attachmentUrls,
    fieldName,
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
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <Header
        fieldName={fieldName}
        attachmentCount={attachments.length}
      />
      
      <PreviewArea
        attachments={attachments}
        attachmentUrls={attachmentUrls}
        onRefreshUrl={refreshAttachmentUrl}
      />
    </div>
  );
}

export default App;
