import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Download, Share2, ExternalLink, MessageCircle, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecorder } from '@/hooks/useRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { useSharing } from '@/hooks/useSharing';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSummary } from '@/hooks/useSummary';

const RecordingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recordings, formatTime, isLoading } = useRecorder();
  const { user } = useAuth();
  const { generateShareLink, exportToMp3, isGeneratingLink, isExporting } = useSharing();
  const { generateSummary, getSummaryByTranscriptId, getTranscriptByRecordingId, isGenerating } = useSummary();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareExpiry, setShareExpiry] = useState('7');
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp3'>('mp3');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number>(0);
  const [transcript, setTranscript] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const recording = recordings.find(r => r.id === id);

  // Initialize accurate duration and file size
  useEffect(() => {
    if (!recording) return;
    const duration = Number.isFinite(recording.duration) ? recording.duration : 0;
    setTotalDuration(duration);
    const size = (recording as any).fileSize ?? recording.audioBlob?.size ?? 0;
    setFileSize(size);
  }, [recording]);

  // Load transcript and summary data
  useEffect(() => {
    if (!recording) return;
    
    const loadTranscriptAndSummary = async () => {
      const transcriptData = await getTranscriptByRecordingId(recording.id);
      setTranscript(transcriptData);
      
      if (transcriptData) {
        const summaryData = await getSummaryByTranscriptId(transcriptData.id);
        setSummary(summaryData);
      }
    };
    
    loadTranscriptAndSummary();
  }, [recording, getTranscriptByRecordingId, getSummaryByTranscriptId]);

  // If file size is missing, try HEAD request to get content-length
  useEffect(() => {
    if (!recording) return;
    const fetchSize = async () => {
      try {
        if (fileSize === 0 && recording.audioUrl) {
          const res = await fetch(recording.audioUrl, { method: 'HEAD' });
          const len = res.headers.get('content-length');
          if (len) setFileSize(parseInt(len, 10));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchSize();
  }, [fileSize, recording]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-9 w-32 bg-muted/50 rounded animate-pulse" />
          </div>

          {/* Recording Player skeleton */}
          <Card className="p-8 bg-gradient-card shadow-soft">
            <div className="text-center mb-8">
              <div className="h-9 w-64 bg-muted/50 rounded animate-pulse mx-auto mb-2" />
              <div className="h-5 w-48 bg-muted/50 rounded animate-pulse mx-auto" />
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-muted/50 animate-pulse" />
              
              <div className="text-center">
                <div className="h-8 w-32 bg-muted/50 rounded animate-pulse mx-auto mb-2" />
                <div className="w-80 bg-muted rounded-full h-2">
                  <div className="bg-muted/50 h-2 rounded-full w-0" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-32 bg-muted/50 rounded animate-pulse" />
                <div className="h-10 w-24 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          </Card>

          {/* Recording Details skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-5 w-16 bg-muted/50 rounded animate-pulse mb-2" />
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show not found only when loading is complete and recording doesn't exist
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
            Back to Lectures
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
    exportToMp3(recording.audioBlob, recording.name, exportFormat);
  };

  const handleShare = async () => {
    try {
      const result = await generateShareLink(recording.id, parseInt(shareExpiry));
      setShareUrl(result.shareUrl);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Check out this lecture recording: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so copy to clipboard with instruction
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share this link in your Instagram story or DM.",
    });
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast({
        title: "No Transcript",
        description: "This recording needs to be transcribed first.",
        variant: "destructive",
      });
      return;
    }

    const newSummary = await generateSummary(transcript.id);
    if (newSummary) {
      setSummary(newSummary);
    }
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
            Back to Lectures
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
            onLoadedMetadata={() => setTotalDuration(Math.floor(audioRef.current?.duration || recording.duration || 0))}
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
                  {formatTime(Math.floor(currentTime))} / {formatTime(totalDuration)}
                </div>
                <div className="w-80 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-100"
                    style={{ 
                      width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export Audio'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Audio</DialogTitle>
                    <DialogDescription>Select your preferred export format.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="format">Export Format</Label>
                      <Select value={exportFormat} onValueChange={(value: 'webm' | 'mp3') => setExportFormat(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp3">MP3 (Recommended)</SelectItem>
                          <SelectItem value="webm">WebM (Original)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleDownload} disabled={isExporting} className="flex-1">
                        {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Lecture</DialogTitle>
                    <DialogDescription>Generate a secure, expiring link to share.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="expiry">Link Expiry</Label>
                      <Select value={shareExpiry} onValueChange={setShareExpiry}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Recipients will need to create an account to access the shared recording. 
                        The link will expire after the selected time period.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleShare} disabled={isGeneratingLink} className="flex-1">
                        {isGeneratingLink ? 'Generating...' : 'Generate Share Link'}
                      </Button>
                      <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                    
                    {shareUrl && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm font-mono break-all">{shareUrl}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleWhatsAppShare}
                            className="flex-1"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleInstagramShare}
                            className="flex-1"
                          >
                            <Instagram className="h-4 w-4 mr-2" />
                            Instagram
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* Summary Section */}
        {transcript && (
          <Card className="p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Summary</h3>
              {!summary && (
                <Button 
                  onClick={handleGenerateSummary} 
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </Button>
              )}
            </div>
            
            {summary ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Overview</h4>
                  <p className="text-muted-foreground leading-relaxed">{summary.content}</p>
                </div>
                
                {summary.bullet_points && summary.bullet_points.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {summary.bullet_points.map((point: string, index: number) => (
                        <li key={index} className="text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground border-t pt-4">
                  Summary generated on {new Date(summary.created_at).toLocaleDateString()} • {summary.word_count} words
                </div>
              </div>
            ) : !isGenerating && (
              <p className="text-muted-foreground">
                Generate an AI-powered summary to get key insights and main points from this recording.
              </p>
            )}
          </Card>
        )}

        {/* Recording Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Duration</h3>
            <p className="text-muted-foreground">{formatTime(totalDuration)}</p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">File Size</h3>
            <p className="text-muted-foreground">
              {(fileSize / (1024 * 1024)).toFixed(2)} MB
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
