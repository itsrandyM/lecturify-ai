import { useState, useRef } from 'react';
import { Play, Pause, Trash2, Edit3, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Recording } from '@/hooks/useRecorder';
import { cn } from '@/lib/utils';

interface RecordingCardProps {
  recording: Recording;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  formatTime: (seconds: number) => string;
}

export const RecordingCard = ({ 
  recording, 
  onDelete, 
  onRename, 
  formatTime 
}: RecordingCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(recording.name);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRename = () => {
    if (editName.trim() && editName !== recording.name) {
      onRename(recording.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(recording.name);
    setIsEditing(false);
  };

  return (
    <Card className="p-4 bg-gradient-card shadow-soft hover:shadow-lg transition-all duration-300 animate-fade-in">
      <audio
        ref={audioRef}
        src={recording.audioUrl}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          // Auto-play functionality can be added here if needed
        }}
      />
      
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary ml-0.5" />
          )}
        </Button>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleRename}>
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground truncate">
                  {recording.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatTime(recording.duration)}</span>
                <span>•</span>
                <span>{recording.createdAt.toLocaleDateString()}</span>
                <span>{recording.createdAt.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            </>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(recording.id)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};