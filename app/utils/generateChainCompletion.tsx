import { ChatOpenAI } from '@langchain/openai';
import Groq from 'groq-sdk';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableConfig, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables are not set.');
}

const SYSTEM_MESSAGE =
  'You are a helpful assistant conducting an interview to collect information for calculating a health insurance premium. Ensure all required questions are answered thoroughly.';
const AI_INSTRUCTIONS = `To calculate your health insurance premium, please provide the following information. Check the conversation history for any already answered questions and ensure completeness:

  1. Frequency of eating fruits and vegetables.
  2. Frequency of consuming fast food or junk food.
  3. Daily water intake (glasses).
  4. Frequency of drinking sugary beverages.
  5. Frequency of alcohol consumption.
  6. Days per week of exercise.
  7. Type of exercise usually performed.
  8. Average duration of each exercise session.
  9. Frequency of physical activities like walking or cycling for commuting.
  10. Average hours of sleep per night.
  11. Frequency of feeling stressed.
  
  Iteratively go through the questions and ask the first unanswered one. If any information is missing or incomplete, kindly ask the user to provide the necessary details.
  
  If the user attempts to divert from the interview topic, politely steer the conversation back to the interview to gather the required information. Ignore queries unrelated to the health insurance premium calculation.`;

export const generateChainCompletion = traceable(
  async (responseText: string, sessionId: string): Promise<any> => {
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_MESSAGE],
        new MessagesPlaceholder('history'),
        ['human', '{input}'],
        ['ai', AI_INSTRUCTIONS],
      ]);

      const chain = prompt.pipe(
        new ChatOpenAI({
          temperature: 0,
          model: config.inferenceModel,
          maxTokens: config.maxTokens,
        }),
      );

      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId: string) =>
          new UpstashRedisChatMessageHistory({
            sessionId,
            config: {
              url: UPSTASH_REDIS_REST_URL!,
              token: UPSTASH_REDIS_REST_TOKEN!,
            },
          }),
        inputMessagesKey: 'input',
        historyMessagesKey: 'history',
      });

      const completion = await chainWithHistory.invoke(
        {
          input: responseText,
        },
        {
          configurable: {
            sessionId: sessionId,
          },
        },
      );

      return completion;
    } catch (error) {
      console.error('Error generating chain completion:', error);
      throw error;
    }
  },
  { name: 'generateChainCompletion' },
);
