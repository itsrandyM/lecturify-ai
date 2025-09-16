import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Users, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSharing } from '@/hooks/useSharing';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';

const SharedRecording = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getSharedRecording } = useSharing();
  const { user } = useAuth();
  const [recording, setRecording] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!token) {
      setError('Invalid shared link');
      setLoading(false);
      return;
    }

    const loadSharedRecording = async () => {
      try {
        const recordingData = await getSharedRecording(token);
        setRecording(recordingData);
      } catch (err: any) {
        setError(err.message || 'Failed to load shared recording');
      } finally {
        setLoading(false);
      }
    };

    loadSharedRecording();
  }, [token, getSharedRecording, user, navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared recording...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In to Access
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Recording Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The shared recording you're looking for doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

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
            Back to Home
          </Button>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            Shared Recording
          </Badge>
        </div>

        {/* Recording Player */}
        <Card className="p-8 bg-gradient-card shadow-soft">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {recording.title}
            </h1>
            <p className="text-muted-foreground flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(recording.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(recording.duration)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Shared by {recording.sharedBy} • Accessed {recording.accessCount} times
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
          </div>
        </Card>

        {/* Recording Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Duration</h3>
            <p className="text-muted-foreground">{formatTime(recording.duration)}</p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Access Info</h3>
            <p className="text-muted-foreground">
              Expires on {new Date(recording.expiresAt).toLocaleDateString()}
            </p>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="p-6 mt-8 text-center bg-gradient-card">
          <h3 className="text-xl font-semibold mb-2">Like what you hear?</h3>
          <p className="text-muted-foreground mb-4">
            Create your own account to record and share your lectures
          </p>
          <Button onClick={() => navigate('/auth')}>
            Get Started with LectureAI Recorder
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default SharedRecording;