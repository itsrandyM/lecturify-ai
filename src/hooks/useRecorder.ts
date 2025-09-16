import { useState, useRef, useCallback } from 'react';

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecording: Recording = {
          id: Date.now().toString(),
          name: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          duration: recordingTime,
          createdAt: new Date(),
          audioBlob,
          audioUrl,
        };

        setRecordings(prev => [newRecording, ...prev]);
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
    }
  }, [recordingTime]);

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

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => {
      const recordingToDelete = prev.find(r => r.id === id);
      if (recordingToDelete) {
        URL.revokeObjectURL(recordingToDelete.audioUrl);
      }
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const renameRecording = useCallback((id: string, newName: string) => {
    setRecordings(prev => 
      prev.map(recording => 
        recording.id === id ? { ...recording, name: newName } : recording
      )
    );
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordings,
    recordingTime,
    startRecording,
    stopRecording,
    deleteRecording,
    renameRecording,
    formatTime,
  };
};