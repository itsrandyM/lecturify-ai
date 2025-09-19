import { useState } from 'react';
import { RecordingCard } from './RecordingCard';
import { UnitsFilter } from './UnitsFilter';
import { Recording, Unit } from '@/hooks/useRecorder';
import { LoadingState, LoadingCard } from '@/components/ui/loading-spinner';
import { Mic, Music, AudioWaveform } from 'lucide-react';

interface RecordingsListProps {
  recordings: Recording[];
  isLoading: boolean;
  units: Unit[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onCreateUnit: (name: string) => Promise<Unit | undefined>;
  onUpdateRecordingUnit: (recordingId: string, unitId: string) => void;
  formatTime: (seconds: number) => string;
}

export const RecordingsList = ({ 
  recordings, 
  isLoading,
  units,
  onDelete, 
  onRename,
  onCreateUnit,
  onUpdateRecordingUnit,
  formatTime 
}: RecordingsListProps) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const filteredRecordings = selectedUnit 
    ? recordings.filter(r => r.unitId === selectedUnit)
    : recordings;

  const groupedRecordings = filteredRecordings.reduce((acc, recording) => {
    const unitName = recording.unitName || 'Unassigned';
    if (!acc[unitName]) {
      acc[unitName] = [];
    }
    acc[unitName].push(recording);
    return acc;
  }, {} as Record<string, Recording[]>);
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted/50 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <LoadingCard key={i}>Loading recordings...</LoadingCard>
          ))}
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative mb-8">
          {/* Floating icons animation */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-primary opacity-20 animate-pulse"></div>
            </div>
            <div className="absolute top-0 left-0 animate-bounce delay-100">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="absolute top-4 right-0 animate-bounce delay-300">
              <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center">
                <Music className="w-3 h-3 text-accent" />
              </div>
            </div>
            <div className="absolute bottom-0 right-4 animate-bounce delay-500">
              <div className="w-7 h-7 rounded-full bg-secondary/50 flex items-center justify-center">
                <AudioWaveform className="w-4 h-4 text-secondary-foreground/70" />
              </div>
            </div>
          </div>
          
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-xl font-semibold text-foreground">No lectures recorded yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tap the record button above to start capturing your first lecture. 
              Your recordings will be saved securely and accessible from anywhere.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>Cloud storage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                <span>High quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-foreground/70"></div>
                <span>AI-enhanced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          My Lectures
        </h2>
        <div className="text-sm text-muted-foreground">
          {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
        </div>
      </div>

      <UnitsFilter
        units={units}
        selectedUnit={selectedUnit}
        onUnitSelect={setSelectedUnit}
        onCreateUnit={onCreateUnit}
      />
      
      <div className="space-y-6">
        {Object.entries(groupedRecordings).map(([unitName, unitRecordings]) => (
          <div key={unitName} className="space-y-3">
            <h3 className="text-lg font-medium text-foreground border-b pb-2">
              {unitName}
            </h3>
            <div className="space-y-3 group pl-4">
              {unitRecordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  units={units}
                  onDelete={onDelete}
                  onRename={onRename}
                  onUpdateUnit={onUpdateRecordingUnit}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};