import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRecorder } from '@/hooks/useRecorder';
import { useAuth } from '@/contexts/AuthContext';

const RecordingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recordings, formatTime } = useRecorder();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const recording = recordings.find(r => r.id === id);

  if (!recording) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Recording Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The recording you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
          </Button>
        </Card>
      </div>
    );
  }

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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = recording.audioUrl;
    link.download = `${recording.name}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recordings
          </Button>
        </div>

        {/* Recording Player */}
        <Card className="p-8 bg-gradient-card shadow-soft">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {recording.name}
            </h1>
            <p className="text-muted-foreground">
              Recorded on {recording.createdAt.toLocaleDateString()} at{' '}
              {recording.createdAt.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>

          <audio
            ref={audioRef}
            src={recording.audioUrl}
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            className="hidden"
          />

          {/* Player Controls */}
          <div className="flex flex-col items-center gap-6">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>

            {/* Time Display */}
            <div className="text-center">
              <div className="text-2xl font-mono font-bold mb-2">
                {formatTime(Math.floor(currentTime))} / {formatTime(recording.duration)}
              </div>
              <div className="w-80 bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-100"
                  style={{ 
                    width: `${recording.duration > 0 ? (currentTime / recording.duration) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Recording Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Duration</h3>
            <p className="text-muted-foreground">{formatTime(recording.duration)}</p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">File Size</h3>
            <p className="text-muted-foreground">
              {(recording.audioBlob.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Format</h3>
            <p className="text-muted-foreground">WebM Audio</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RecordingDetail;