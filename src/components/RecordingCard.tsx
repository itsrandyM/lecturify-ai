import { useState, useRef } from 'react';
import { Play, Pause, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Recording, Unit } from '@/hooks/useRecorder';
import { useNavigate } from 'react-router-dom';

interface RecordingCardProps {
  recording: Recording;
  units: Unit[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onUpdateUnit: (recordingId: string, unitId: string) => void;
  formatTime: (seconds: number) => string;
}

export const RecordingCard = ({ 
  recording, 
  units,
  onDelete, 
  onRename,
  onUpdateUnit,
  formatTime 
}: RecordingCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(recording.name);
  const [showUnitSelect, setShowUnitSelect] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();

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

  const handleCardClick = () => {
    if (!isEditing) {
      navigate(`/recording/${recording.id}`);
    }
  };

  return (
    <Card 
      className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer group bg-gradient-card border-soft"
      onClick={handleCardClick}
    >
      <audio
        ref={audioRef}
        src={recording.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-primary/10"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="text-sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRename}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h3 className="font-medium text-foreground truncate">
                  {recording.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
                  <span>{recording.createdAt.toLocaleDateString()}</span>
                  <span>{formatTime(recording.duration)}</span>
                  {recording.unitName && (
                    <span className="text-primary font-medium">{recording.unitName}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditing && !showUnitSelect && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnitSelect(true);
                }}
                className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20"
                title="Move to unit"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recording.id);
                }}
                className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {showUnitSelect && (
            <div className="flex items-center space-x-2">
              <Select
                value={recording.unitId || ''}
                onValueChange={(value) => {
                  if (value && value !== recording.unitId) {
                    onUpdateUnit(recording.id, value);
                  }
                  setShowUnitSelect(false);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnitSelect(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};