import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SharedLink {
  id: string;
  recording_id: string;
  link_token: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
  access_count: number;
  max_access_count: number | null;
}

export const useSharing = () => {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const generateShareLink = useCallback(async (recordingId: string, expiryDays: number = 7) => {
    setIsGeneratingLink(true);
    try {
      // Generate a secure token using crypto
      const tokenData = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(tokenData, byte => byte.toString(16).padStart(2, '0')).join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          recording_id: recordingId,
          link_token: token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/shared/${data.link_token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link generated!",
        description: "Link copied to clipboard. Expires in " + expiryDays + " days.",
      });

      return { shareUrl, token: data.link_token };
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error generating share link",
        description: "Failed to create shareable link. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGeneratingLink(false);
    }
  }, [toast]);

  const exportToMp3 = useCallback(async (audioBlob: Blob, filename: string, format: 'webm' | 'mp3' = 'webm') => {
    setIsExporting(true);
    try {
      if (format === 'mp3') {
        // Convert WebM to MP3
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // MP3 encoding using lamejs (convert Float32 -> Int16)
        const { default: lamejs } = await import('lamejs');
        const mp3encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
        const samples = audioBuffer.getChannelData(0);
        const sampleBlockSize = 1152;
        const mp3Data: Uint8Array[] = [];

        const floatTo16BitPCM = (input: Float32Array) => {
          const output = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          return output;
        };
        
        for (let i = 0; i < samples.length; i += sampleBlockSize) {
          const sampleChunk = samples.subarray(i, i + sampleBlockSize);
          const sampleChunk16 = floatTo16BitPCM(sampleChunk);
          const mp3buf = mp3encoder.encodeBuffer(sampleChunk16);
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
        }
        
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
        
        const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(mp3Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Original WebM download
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful!",
        description: `Audio file has been downloaded as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Error exporting audio:', error);
      toast({
        title: "Export failed",
        description: "Failed to export audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const getSharedRecording = useCallback(async (token: string) => {
    try {
      // Get shared link info
      const { data: sharedLink, error: linkError } = await supabase
        .from('shared_links')
        .select(`
          *,
          recordings (
            id,
            title,
            duration,
            created_at,
            file_path
          )
        `)
        .eq('link_token', token)
        .eq('is_active', true)
        .single();

      if (linkError) throw linkError;
      if (!sharedLink) throw new Error('Shared link not found');

      // Check if link has expired
      if (new Date(sharedLink.expires_at) < new Date()) {
        throw new Error('This shared link has expired');
      }

      // Increment access count
      await supabase
        .from('shared_links')
        .update({ access_count: sharedLink.access_count + 1 })
        .eq('id', sharedLink.id);

      // Get signed URL for the recording
      const { data: signed, error: signedError } = await supabase.storage
        .from('recordings')
        .createSignedUrl(sharedLink.recordings.file_path, 60 * 60); // 1 hour

      if (signedError) throw signedError;

      return {
        ...sharedLink.recordings,
        audioUrl: signed.signedUrl,
        sharedBy: 'Anonymous User', // We don't expose user info in shared links
        accessCount: sharedLink.access_count + 1,
        expiresAt: sharedLink.expires_at,
      };
    } catch (error) {
      console.error('Error getting shared recording:', error);
      throw error;
    }
  }, []);

  return {
    generateShareLink,
    exportToMp3,
    getSharedRecording,
    isGeneratingLink,
    isExporting,
  };
};