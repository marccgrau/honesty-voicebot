import OpenAI from 'openai';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';

const openai = new OpenAI();

export const generateTTS = traceable(
  async (responseText: string, ttsVoice: string) => {
    const mp3 = await openai.audio.speech.create({
      model: config.ttsModel,
      voice: ttsVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: responseText,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    return `data:audio/mpeg;base64,${base64Audio}`;
  },
  { name: 'generateTTS' },
);
