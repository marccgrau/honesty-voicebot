import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { Runnable, RunnableWithMessageHistory } from '@langchain/core/runnables';
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

// Function to create the prompt
function createPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_MESSAGE],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
    ['ai', AI_INSTRUCTIONS],
  ]);
}

// Function to initialize the chain
function initializeChain(prompt: ChatPromptTemplate) {
  return prompt.pipe(
    new ChatOpenAI({
      model: config.inferenceModel,
      maxTokens: config.maxTokens,
      temperature: config.modelTemperature,
    }),
  );
}

// Function to handle the chain with history
function createChainWithHistory(
  chain: Runnable<any, any>,
  sessionId: string,
): RunnableWithMessageHistory<any, any> {
  return new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: () =>
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
}

// Main function to generate chain completion
async function generateCompletion(transcription: string, sessionId: string): Promise<string> {
  try {
    const prompt = createPrompt();
    const chain = initializeChain(prompt);
    const chainWithHistory = createChainWithHistory(chain, sessionId);
    const completion = await chainWithHistory.invoke(
      { input: transcription },
      { configurable: { sessionId } },
    );

    return completion?.lc_kwargs?.content || 'No information available.';
  } catch (error) {
    console.error('Error generating chain completion:', error);
    throw error;
  }
}

// Exporting the main function with traceability
export const generateChainCompletion = traceable(
  async (transcription: string, sessionId: string): Promise<string> => {
    if (config.inferenceModelProvider !== 'openai') {
      throw new Error('This functionality is not yet available for the specified provider.');
    }
    return generateCompletion(transcription, sessionId);
  },
  { name: 'generateChainCompletion' },
);
