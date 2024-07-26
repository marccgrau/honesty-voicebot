import 'server-only';
import { createAI, createStreamableValue } from 'ai/rsc';
import { config } from '../lib/config';
import dotenv from 'dotenv';
import { headers } from 'next/headers';
import { transcribeAudio } from '../lib/services/transcribeAudio';
import { generateTTS } from '../lib/services/generateTTS';
import {
  processImageWithGPT4o,
  processImageWithLllavaOnFalAI,
  processImageWithGoogleGenerativeAI,
} from '../lib/services/processImage';
import { generateChatCompletion } from '../lib/services/generateChatCompletion';
import { answerEngine } from '../lib/services/answerEngine';
import { chatCompletionWithTools } from '../lib/services/chatCompletionWithTools';
import { initializeRateLimit, checkRateLimit } from '../lib/utils/rateLimiting';
import { generateChainCompletion } from '../lib/services/generateChainCompletion';
import { generateJsonChainCompletion } from '../lib/services/generateJsonChainCompletion';
import { generateAgentCompletion } from '../lib/services/generateAgentCompletion';
import { use } from 'react';

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
        streamable.update({ weather: tool_results.uiComponent.data });
        break;
      case 'spotify':
        streamable.update({ spotify: tool_results.uiComponent.data });
        break;
      case 'time':
        responseText = tool_results.uiComponent.data;
        streamable.update({ time: tool_results.uiComponent.data });
        break;
      default:
        streamable.update({ message: tool_results?.message });
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

async function handleJsonChainResponseGeneration(
  responseText: string,
  sessionId: string,
  prolificPid: string,
) {
  try {
    const completion = await generateJsonChainCompletion(responseText, sessionId, prolificPid);
    return completion;
  } catch (error) {
    console.error('Error in json chain response generation:', error);
    throw error;
  }
}

async function handleAgentResponseGeneration(responseText: string, sessionId: string) {
  try {
    const completion = await generateAgentCompletion(responseText, sessionId);
    return completion;
  } catch (error) {
    console.error('Error in agent response generation:', error);
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
      const useTTS = formData.get('useTTS') === 'true';
      const useInternet = formData.get('useInternet') === 'true';
      const usePhotos = formData.get('usePhotos') === 'true';
      const useChainMode = formData.get('useChainMode') === 'true';
      const useJsonMode = formData.get('useJsonMode') === 'true';
      const useAgentMode = formData.get('useAgentMode') === 'true';

      if (!(audioBlob instanceof Blob)) throw new Error('No audio detected');

      const transcription = await handleTranscription(audioBlob);
      streamable.update({ transcription: transcription });

      let responseText = '';

      if (usePhotos) {
        responseText = (await handleImageProcessing(usePhotos, formData, transcription)) || '';
      }
      if (useAgentMode) {
        responseText = (await handleAgentResponseGeneration(transcription, sessionId)) || '';
      }

      if (useChainMode && useJsonMode) {
        console.log('Using both chain and json modes');
        const response =
          (await handleJsonChainResponseGeneration(transcription, sessionId, prolificPid)) || '';
        responseText = response.responseText;
        streamable.update({ allQuestionsAnswered: response.allQuestionsAnswered });
      }

      if (useChainMode && !useJsonMode) {
        responseText = (await handleChainResponseGeneration(transcription, sessionId)) || '';
      }

      if (!responseText) {
        responseText = (await handleResponseGeneration(useInternet, transcription)) || '';
      }

      //responseText = await handleToolsResponse(responseText, streamable);

      streamable.update({ result: responseText });
      if (useTTS) {
        streamable.update({ audio: await generateTTS(responseText) });
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
