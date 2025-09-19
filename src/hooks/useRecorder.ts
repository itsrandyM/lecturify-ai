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
  unitId?: string;
  unitName?: string;
}

export interface Unit {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [recordingCount, setRecordingCount] = useState(0);
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
      // Load units first
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (unitsError) throw unitsError;

      setUnits((unitsData ?? []).map(unit => ({
        id: unit.id,
        name: unit.name,
        userId: unit.user_id,
        createdAt: new Date(unit.created_at),
        updatedAt: new Date(unit.updated_at),
      })));

      // Load recordings with unit information
      const { data: recordingsData, error } = await supabase
        .from('recordings')
        .select(`
          *,
          units(id, name)
        `)
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
          unitId: record.unit_id,
          unitName: record.units?.name,
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
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        // Use recordingTime from UI instead of calculating from audio
        const recordingDuration = recordingTime;
        
        // Get next lecture number for default unit
        const currentCount = recordingCount + 1;
        setRecordingCount(currentCount);
        
        // Create default unit if none exists
        let defaultUnit = units.find(u => u.name === 'Unit 1');
        if (!defaultUnit && units.length === 0) {
          const { data: newUnit, error: unitError } = await supabase
            .from('units')
            .insert({
              name: 'Unit 1',
              user_id: userId,
            })
            .select()
            .single();

          if (unitError) throw unitError;
          defaultUnit = {
            id: newUnit.id,
            name: newUnit.name,
            userId: newUnit.user_id,
            createdAt: new Date(newUnit.created_at),
            updatedAt: new Date(newUnit.updated_at),
          };
          setUnits(prev => [...prev, defaultUnit!]);
        }

        // Try to convert to MP3, fallback to WebM
        let finalBlob = webmBlob;
        let fileName = `recording_${Date.now()}.webm`;
        let contentType = 'audio/webm';
        let mimeType = 'audio/webm';

        try {
          // Convert to MP3 using FFmpeg
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
          
          const ffmpeg = new FFmpeg();
          
          // Load FFmpeg
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          // Convert WebM to MP3
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
          await ffmpeg.exec(['-i', 'input.webm', '-codec:a', 'libmp3lame', '-b:a', '128k', 'output.mp3']);
          
          const mp3Data = await ffmpeg.readFile('output.mp3');
          finalBlob = new Blob([mp3Data], { type: 'audio/mpeg' });
          fileName = `recording_${Date.now()}.mp3`;
          contentType = 'audio/mpeg';
          mimeType = 'audio/mpeg';
          
          console.log('Successfully converted to MP3');
        } catch (error) {
          console.warn('MP3 conversion failed, using WebM fallback:', error);
          // Keep WebM as fallback
        }

        // Save to Supabase (private storage path per user)
        try {
          const filePath = `${userId}/${fileName}`;
          
          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(filePath, finalBlob, {
              contentType,
            });

          if (uploadError) throw uploadError;

          // Save metadata to database
          const { data: recordingData, error: dbError } = await supabase
            .from('recordings')
            .insert({
              title: `Lecture ${currentCount}`,
              file_path: filePath,
              duration: recordingDuration,
              file_size: finalBlob.size,
              mime_type: mimeType,
              original_filename: fileName,
              user_id: userId,
              unit_id: defaultUnit?.id,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        const { data: signed } = await supabase.storage
          .from('recordings')
          .createSignedUrl(filePath, 60 * 60);

        const newRecording: Recording = {
          id: recordingData.id,
          name: recordingData.title,
          duration: recordingDuration,
          createdAt: new Date(recordingData.created_at),
          audioBlob: finalBlob,
          audioUrl: signed?.signedUrl ?? URL.createObjectURL(finalBlob),
          unitId: recordingData.unit_id,
          unitName: defaultUnit?.name,
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
          description: "Recording saved locally but failed to upload to cloud.",
          variant: "destructive",
        });
        
        // Still add to local state as fallback
        const fallbackUrl = URL.createObjectURL(finalBlob || webmBlob);
        const newRecording: Recording = {
          id: Date.now().toString(),
          name: `Lecture ${recordingCount + 1}`,
          duration: recordingDuration,
          createdAt: new Date(),
          audioBlob: finalBlob || webmBlob,
          audioUrl: fallbackUrl,
        };
        setRecordings(prev => [newRecording, ...prev]);
      }
        
        setRecordingTime(0);
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
  }, [recordingTime, userId, toast]);

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

  const createUnit = useCallback(async (name: string) => {
    try {
      const { data: newUnit, error } = await supabase
        .from('units')
        .insert({
          name,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      const unit = {
        id: newUnit.id,
        name: newUnit.name,
        userId: newUnit.user_id,
        createdAt: new Date(newUnit.created_at),
        updatedAt: new Date(newUnit.updated_at),
      };
      setUnits(prev => [...prev, unit]);
      toast({
        title: "Unit created",
        description: `"${name}" unit has been created.`,
      });
      return unit;
    } catch (error) {
      console.error('Error creating unit:', error);
      toast({
        title: "Error creating unit",
        description: "Failed to create unit. Please try again.",
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const updateRecordingUnit = useCallback(async (recordingId: string, unitId: string) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ unit_id: unitId })
        .eq('id', recordingId);

      if (error) throw error;

      const unit = units.find(u => u.id === unitId);
      setRecordings(prev => 
        prev.map(recording => 
          recording.id === recordingId ? { 
            ...recording, 
            unitId,
            unitName: unit?.name 
          } : recording
        )
      );

      toast({
        title: "Recording updated",
        description: "Recording has been moved to the selected unit.",
      });
    } catch (error) {
      console.error('Error updating recording unit:', error);
      toast({
        title: "Error updating recording",
        description: "Failed to update recording unit. Please try again.",
        variant: "destructive",
      });
    }
  }, [units, toast]);

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
    units,
    startRecording,
    stopRecording,
    deleteRecording,
    renameRecording,
    createUnit,
    updateRecordingUnit,
    formatTime,
    loadRecordings,
  };
};
