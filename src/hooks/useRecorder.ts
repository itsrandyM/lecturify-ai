import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Recording {
  id: string;
  name: string;
  duration: number;
  createdAt: Date;
  audioBlob: Blob;
  audioUrl: string;
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auth state + initial load
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer Supabase calls to avoid doing them inside the auth callback
        setTimeout(() => {
          loadRecordings();
        }, 0);
      }
      if (event === 'SIGNED_OUT') {
        setRecordings([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) loadRecordings();
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadRecordings = async () => {
    setIsLoading(true);
    try {
      const { data: recordingsData, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create signed URLs for private bucket
      const localRecordings: Recording[] = await Promise.all((recordingsData ?? []).map(async (record: any) => {
        const { data: signed, error: signedErr } = await supabase.storage
          .from('recordings')
          .createSignedUrl(record.file_path, 60 * 60); // 1 hour
        if (signedErr) throw signedErr;
        return {
          id: record.id,
          name: record.title,
          duration: record.duration,
          createdAt: new Date(record.created_at),
          audioBlob: new Blob(),
          audioUrl: signed.signedUrl,
        } as Recording;
      }));

      setRecordings(localRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: "Error loading recordings",
        description: "Failed to load your recordings from the cloud.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      if (!userId) {
        toast({ title: 'Login required', description: 'Please sign in to record lectures.', variant: 'destructive' });
        // Auto-redirect to auth page
        window.location.href = '/auth';
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);

       try {
        // Calculate duration and handle potential errors
         const audio = new Audio(audioUrl);
         await new Promise((resolve, reject) => {
            audio.addEventListener('loadedmetadata', resolve);
            audio.addEventListener('error', reject);
        });
        
        const actualDuration = Math.floor(audio.duration);

        // --- Start of Supabase logic ---
        const fileName = `recording_${Date.now()}.webm`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(filePath, audioBlob, {
                contentType: 'audio/webm',
            });

        if (uploadError) throw uploadError;

        const { data: recordingData, error: dbError } = await supabase
            .from('recordings')
            .insert({
                title: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                file_path: filePath,
                duration: actualDuration,
                file_size: audioBlob.size,
                mime_type: 'audio/webm',
                original_filename: fileName,
                user_id: userId,
            })
            .select()
            .maybeSingle();

        if (dbError) throw dbError;
        if (!recordingData) throw new Error('No recording returned after insert');

        const { data: signed } = await supabase.storage
            .from('recordings')
            .createSignedUrl(filePath, 60 * 60);

        const newRecording: Recording = {
            id: recordingData.id,
            name: recordingData.title,
            duration: actualDuration,
            createdAt: new Date(recordingData.created_at),
            audioBlob,
            audioUrl: signed?.signedUrl ?? audioUrl,
        };

        setRecordings(prev => [newRecording, ...prev]);

        toast({
            title: "Recording saved!",
            description: "Your recording has been saved to the cloud.",
        });

    } catch (error) {
        console.error('Error saving recording:', error);
        toast({
            title: "Error saving recording",
            description: "Failed to upload recording to cloud. Saved locally.",
            variant: "destructive",
        });

        // Fallback for local storage
        const newRecording: Recording = {
            id: Date.now().toString(),
            name: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            duration: recordingTime, // Use the UI timer as a fallback
            createdAt: new Date(),
            audioBlob,
            audioUrl,
        };
        setRecordings(prev => [newRecording, ...prev]);

    } finally {
        // This is the correct place to reset the timer
        setRecordingTime(0);
    }
};

      mediaRecorder.start(1000);
      setIsRecording(true);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Please allow microphone access and try again.",
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRecording]);

  const deleteRecording = useCallback(async (id: string) => {
    try {
      // Get file path then remove object and row
      const { data: rec, error: fetchErr } = await supabase
        .from('recordings')
        .select('file_path')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (rec?.file_path) {
        await supabase.storage.from('recordings').remove([rec.file_path]);
      }

      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setRecordings(prev => {
        const recordingToDelete = prev.find(r => r.id === id);
        if (recordingToDelete) {
          URL.revokeObjectURL(recordingToDelete.audioUrl);
        }
        return prev.filter(r => r.id !== id);
      });

      toast({
        title: "Recording deleted",
        description: "Your recording has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error deleting recording",
        description: "Failed to delete recording from cloud storage.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const renameRecording = useCallback(async (id: string, newName: string) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('recordings')
        .update({ title: newName })
        .eq('id', id);

      if (error) throw error;

      setRecordings(prev => 
        prev.map(recording => 
          recording.id === id ? { ...recording, name: newName } : recording
        )
      );

      toast({
        title: "Recording renamed",
        description: "Your recording has been successfully renamed.",
      });
    } catch (error) {
      console.error('Error renaming recording:', error);
      toast({
        title: "Error renaming recording",
        description: "Failed to rename recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordings,
    recordingTime,
    isLoading,
    startRecording,
    stopRecording,
    deleteRecording,
    renameRecording,
    formatTime,
    loadRecordings,
  };
};
