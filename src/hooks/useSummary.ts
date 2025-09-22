import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Summary {
  id: string;
  transcript_id: string;
  content: string;
  bullet_points: string[];
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface Transcript {
  id: string;
  recording_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  processing_time?: number;
  confidence_score?: number;
}

export const useSummary = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const { toast } = useToast();

  const generateSummary = async (transcriptId: string): Promise<Summary | null> => {
    setIsGenerating(true);
    try {
      console.log('Generating summary for transcript:', transcriptId);

      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { transcriptId }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate summary');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const summary = data?.summary;
      if (summary) {
        setSummaries(prev => [...prev.filter(s => s.transcript_id !== transcriptId), summary]);
        toast({
          title: "Summary Generated",
          description: "Your recording summary has been created successfully.",
        });
        return summary;
      }

      throw new Error('No summary returned from server');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate summary',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const getSummaryByTranscriptId = async (transcriptId: string): Promise<Summary | null> => {
    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('transcript_id', transcriptId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching summary:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getSummaryByTranscriptId:', error);
      return null;
    }
  };

  const getTranscriptByRecordingId = async (recordingId: string): Promise<Transcript | null> => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('recording_id', recordingId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching transcript:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getTranscriptByRecordingId:', error);
      return null;
    }
  };

  return {
    isGenerating,
    summaries,
    transcripts,
    generateSummary,
    getSummaryByTranscriptId,
    getTranscriptByRecordingId,
  };
};