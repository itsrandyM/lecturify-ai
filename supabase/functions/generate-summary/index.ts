import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      transcripts: {
        Row: {
          id: string;
          recording_id: string;
          content: string;
          created_at: string;
          updated_at: string;
          processing_time?: number;
          confidence_score?: number;
        };
      };
      summaries: {
        Row: {
          id: string;
          transcript_id: string;
          content: string;
          bullet_points: string[];
          word_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          transcript_id: string;
          content: string;
          bullet_points: string[];
          word_count: number;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptId } = await req.json();
    
    if (!transcriptId) {
      throw new Error('Transcript ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    console.log('Fetching transcript:', transcriptId);

    // Get the transcript content
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      console.error('Transcript fetch error:', transcriptError);
      throw new Error('Transcript not found');
    }

    console.log('Transcript found, content length:', transcript.content.length);

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('summaries')
      .select('*')
      .eq('transcript_id', transcriptId)
      .single();

    if (existingSummary) {
      console.log('Summary already exists, returning existing summary');
      return new Response(JSON.stringify({ 
        summary: existingSummary,
        message: 'Summary already exists' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate summary using OpenAI
    console.log('Generating summary with OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating educational summaries from lecture transcripts. 
            Create a comprehensive summary that includes:
            1. A detailed paragraph summary (2-3 paragraphs)
            2. Key bullet points (5-8 main points)
            
            Focus on the main concepts, important details, and actionable insights.
            Make it suitable for students reviewing the material.
            
            Return your response as a JSON object with this exact structure:
            {
              "content": "detailed paragraph summary here",
              "bullet_points": ["bullet point 1", "bullet point 2", "etc"]
            }`
          },
          {
            role: 'user',
            content: `Please summarize this lecture transcript:\n\n${transcript.content}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openAIData = await response.json();
    console.log('OpenAI response received');
    
    const aiContent = openAIData.choices[0].message.content;
    
    let summaryData;
    try {
      summaryData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: treat the whole response as content
      summaryData = {
        content: aiContent,
        bullet_points: []
      };
    }

    // Calculate word count
    const wordCount = summaryData.content.split(/\s+/).length;

    // Insert summary into database
    const { data: newSummary, error: insertError } = await supabase
      .from('summaries')
      .insert({
        transcript_id: transcriptId,
        content: summaryData.content,
        bullet_points: summaryData.bullet_points || [],
        word_count: wordCount,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Summary insert error:', insertError);
      throw new Error('Failed to save summary');
    }

    console.log('Summary created successfully:', newSummary.id);

    return new Response(JSON.stringify({ 
      summary: newSummary,
      message: 'Summary generated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-summary function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});