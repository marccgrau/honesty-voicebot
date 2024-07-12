import 'server-only';
import { createAI, createStreamableValue, createStreamableUI } from 'ai/rsc';
import { config } from './config';
import dotenv from 'dotenv';
// Rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import { transcribeAudio } from './utils/transcribeAudio';
import { generateTTS } from './utils/generateTTS';
import {
  processImageWithGPT4o,
  processImageWithLllavaOnFalAI,
  processImageWithGoogleGenerativeAI,
} from './utils/processImage';
import { generateChatCompletion } from './utils/generateChatCompletion';
import { answerEngine } from './utils/answerEngine';
import { chatCompletionWithTools } from './utils/chatCompletionWithTools';
import { initializeRateLimit, checkRateLimit } from './utils/rateLimiting';
import { generateChainCompletion } from './utils/generateChainCompletion';
import { use } from 'react';

dotenv.config();

let ratelimit: Ratelimit | undefined;
if (config.useRateLimiting) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, '10 m'), // 30 requests per 10 minutes
  });
}

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

async function handleImageProcessing(
  usePhotos: boolean,
  formData: FormData,
  transcription: string,
) {
  if (usePhotos) {
    const image = formData.get('image');
    if (image instanceof File) {
      try {
        let result;
        switch (config.visionModelProvider) {
          case 'fal.ai':
            result = await processImageWithLllavaOnFalAI(image, transcription);
            break;
          case 'google':
            result = await processImageWithGoogleGenerativeAI(image, transcription);
            break;
          default:
            result = await processImageWithGPT4o(image, transcription);
        }
        console.log('Image processing successful:', result);
        return result;
      } catch (error) {
        console.error('Error in image processing:', error);
        throw error;
      }
    } else {
      console.warn('No image file found in formData.');
      return 'You might have forgotten to upload an image';
    }
  }
  return null;
}

async function handleResponseGeneration(useInternet: boolean, transcription: string) {
  try {
    let result;
    if (useInternet) {
      result = await answerEngine(transcription);
    } else {
      result = await generateChatCompletion(transcription);
    }
    return result;
  } catch (error) {
    console.error('Error in response generation:', error);
    throw error;
  }
}

async function handleToolsResponse(responseText: string, streamable: any) {
  const tool_results = await chatCompletionWithTools(responseText);
  if (tool_results?.uiComponent) {
    switch (tool_results.uiComponent.component) {
      case 'weather':
        streamable.update({ 'weather': tool_results.uiComponent.data });
        break;
      case 'spotify':
        streamable.update({ 'spotify': tool_results.uiComponent.data });
        break;
      case 'time':
        responseText = tool_results.uiComponent.data;
        streamable.update({ 'time': tool_results.uiComponent.data });
        break;
      default:
        streamable.update({ 'message': tool_results?.message });
    }
  }
  return responseText;
}

async function handleChainResponseGeneration(responseText: string, sessionId: string) {
  try {
    const completion = await generateChainCompletion(responseText, sessionId);
    return completion;
  } catch (error) {
    console.error('Error in chain response generation:', error);
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
        streamable.done({ 'result': rateLimitMessage });
        return;
      }

      const formData = obj;
      const audioBlob = formData.get('audio');
      const sessionId = formData.get('sessionId') as string;
      const useTTS = formData.get('useTTS') === 'true';
      const useInternet = formData.get('useInternet') === 'true';
      const usePhotos = formData.get('usePhotos') === 'true';
      const useChainMode = formData.get('useChainMode') === 'true';

      if (!(audioBlob instanceof Blob)) throw new Error('No audio detected');

      const transcription = await handleTranscription(audioBlob);
      streamable.update({ 'transcription': transcription });

      let responseText = '';

      if (usePhotos) {
        responseText = (await handleImageProcessing(usePhotos, formData, transcription)) || '';
      }

      if (useChainMode) {
        responseText = (await handleChainResponseGeneration(transcription, sessionId)) || '';
      }

      if (!responseText) {
        responseText = (await handleResponseGeneration(useInternet, transcription)) || '';
      }

      responseText = await handleToolsResponse(responseText, streamable);

      streamable.update({ 'result': responseText });
      if (useTTS) {
        streamable.update({ 'audio': await generateTTS(responseText) });
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
