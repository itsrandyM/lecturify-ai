import { useRecorder } from '@/hooks/useRecorder';
import { RecordButton } from '@/components/RecordButton';
import { RecordingsList } from '@/components/RecordingsList';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';

const Index = () => {
  const {
    isRecording,
    recordings,
    recordingTime,
    isLoading,
    startRecording,
    stopRecording,
    deleteRecording,
    renameRecording,
    formatTime,
  } = useRecorder();

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Top bar */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="icon" asChild aria-label="Settings">
            <Link to="/settings">
              <SettingsIcon className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            LectureAI Recorder
          </h1>
          <p className="text-muted-foreground text-lg">
            Record, enhance, and organize your class lectures with AI
          </p>
        </div>

        {/* Recording Section */}
        <div className="flex justify-center mb-12">
          <RecordButton
            isRecording={isRecording}
            onStart={startRecording}
            onStop={stopRecording}
            recordingTime={recordingTime}
            formatTime={formatTime}
          />
        </div>

        {/* Recordings List */}
        <div className="max-w-2xl mx-auto">
          <RecordingsList
            recordings={recordings}
            isLoading={isLoading}
            onDelete={deleteRecording}
            onRename={renameRecording}
            formatTime={formatTime}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
