import { RecordingCard } from './RecordingCard';
import { Recording } from '@/hooks/useRecorder';

interface RecordingsListProps {
  recordings: Recording[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  formatTime: (seconds: number) => string;
}

export const RecordingsList = ({ 
  recordings, 
  onDelete, 
  onRename, 
  formatTime 
}: RecordingsListProps) => {
  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">No recordings yet</div>
          <div className="text-sm">Start recording to see your lectures here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          My Recordings
        </h2>
        <div className="text-sm text-muted-foreground">
          {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="space-y-3 group">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            onDelete={onDelete}
            onRename={onRename}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
};