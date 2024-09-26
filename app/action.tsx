import 'server-only';
import { createAI, createStreamableValue } from 'ai/rsc';
import { config } from '../lib/config';
import dotenv from 'dotenv';
import { headers } from 'next/headers';
import { transcribeAudio } from '../lib/services/transcribeAudio';
import { generateTTS } from '../lib/services/generateTTS';
import { initializeRateLimit, checkRateLimit } from '../lib/utils/rateLimiting';
import { generateJsonChainCompletion } from '../lib/services/generateJsonChainCompletion';

dotenv.config();

async function handleRateLimiting() {
  if (config.useRateLimiting) {
    const identifier =
      headers().get('x-forwarded-for') ||
      headers().get('x-real-ip') ||
      headers().get('cf-connecting-ip') ||
      headers().get('client-ip') ||
      '';
    initializeRateLimit();
    if (!(await checkRateLimit(identifier))) {
      console.error(`Rate limit reached for identifier: ${identifier}`);
      return 'Rate Limit Reached. Please try again later.';
    }
  }
  return null;
}

async function handleTranscription(audioBlob: Blob) {
  const timestamp = Date.now();
  try {
    const transcription = await transcribeAudio(audioBlob, timestamp);
    console.log('Transcription successful:', transcription);
    return transcription;
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}

async function handleJsonChainResponseGeneration(
  responseText: string,
  sessionId: string,
  prolificPid: string,
  userId: string,
  ttsVoice: string,
) {
  try {
    const completion = await generateJsonChainCompletion(
      responseText,
      sessionId,
      prolificPid,
      userId,
      ttsVoice,
    );
    return completion;
  } catch (error) {
    console.error('Error in json chain response generation:', error);
    throw error;
  }
}

async function action(obj: FormData): Promise<any> {
  'use server';
  const streamable = createStreamableValue();

  (async () => {
    try {
      const rateLimitMessage = await handleRateLimiting();
      if (rateLimitMessage) {
        streamable.done({ result: rateLimitMessage });
        return;
      }

      const formData = obj;
      const audioBlob = formData.get('audio');
      const sessionId = formData.get('sessionId') as string;
      const prolificPid = formData.get('prolificPid') as string;
      const userId = formData.get('userId') as string;
      const useTTS = formData.get('useTTS') === 'true';
      const useChainMode = formData.get('useChainMode') === 'true';
      const useJsonMode = formData.get('useJsonMode') === 'true';
      const ttsVoice = formData.get('ttsVoice') as string;

      if (!(audioBlob instanceof Blob)) throw new Error('No audio detected');

      const transcription = await handleTranscription(audioBlob);
      streamable.update({ transcription: transcription });

      let responseText = '';

      console.log('Using both chain and json modes');
      const response =
        (await handleJsonChainResponseGeneration(
          transcription,
          sessionId,
          prolificPid,
          userId,
          ttsVoice,
        )) || '';
      responseText = response.responseText;
      streamable.update({ allQuestionsAnswered: response.allQuestionsAnswered });

      streamable.update({ result: responseText });
      if (useTTS) {
        streamable.update({ audio: await generateTTS(responseText, ttsVoice) });
      }
      streamable.done({ status: 'done' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error processing action:', errorMessage);
      streamable.done({ error: errorMessage });
    }
  })();

  return streamable.value;
}

const initialAIState: {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  id?: string;
  name?: string;
}[] = [];

const initialUIState: {
  text: string;
  id?: string;
}[] = [];

export const AI = createAI({
  actions: { action },
  initialAIState,
  initialUIState,
});
