import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecordButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  recordingTime: number;
  formatTime: (seconds: number) => string;
}

export const RecordButton = ({ 
  isRecording, 
  onStart, 
  onStop, 
  recordingTime, 
  formatTime 
}: RecordButtonProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <Button
        onClick={isRecording ? onStop : onStart}
        size="lg"
        className={cn(
          "h-20 w-20 rounded-full transition-all duration-300",
          isRecording 
            ? "bg-recording hover:bg-recording/90 animate-pulse-record shadow-record" 
            : "bg-gradient-primary hover:scale-105 shadow-soft"
        )}
      >
        {isRecording ? (
          <Square className="h-8 w-8 fill-current" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      
      {isRecording && (
        <div className="text-center animate-fade-in">
          <div className="text-2xl font-bold text-recording">
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            Recording in progress...
          </div>
        </div>
      )}
      
      {!isRecording && (
        <div className="text-center">
          <div className="text-lg font-medium text-foreground">
            Tap to start recording
          </div>
          <div className="text-sm text-muted-foreground">
            High-quality audio capture
          </div>
        </div>
      )}
    </div>
  );
};