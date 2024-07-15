import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory, RunnableMap } from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';
import { saveJson, getJson } from './mongoUtil';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables are not set.');
}

interface Responses {
  fruitsVegetables: string;
  fastFood: string;
  waterIntake: string;
  sugaryBeverages: string;
  alcohol: string;
  exerciseDays: string;
  exerciseType: string;
  exerciseDuration: string;
  physicalActivities: string;
  sleepHours: string;
  stressFrequency: string;
}

const initialResponses: Responses = {
  fruitsVegetables: '',
  fastFood: '',
  waterIntake: '',
  sugaryBeverages: '',
  alcohol: '',
  exerciseDays: '',
  exerciseType: '',
  exerciseDuration: '',
  physicalActivities: '',
  sleepHours: '',
  stressFrequency: '',
};

const CONVERSATION_SYSTEM_MESSAGE = `You are a helpful assistant conducting an interview to collect information for calculating a health insurance premium. 
  Ensure all required questions are answered thoroughly.
  You will get a description of the required information, the conversation history, and a JSON file with the responses given so far.
  If an answer is missing, the value will be N/A, an empty string, or null.`;
const CONVERSATION_AI_INSTRUCTIONS = `To calculate the health insurance premium, the following information needs to be provided:

  1. Frequency of eating fruits and vegetables. (fruitsVegetables)
  2. Frequency of consuming fast food or junk food. (fastFood)
  3. Daily water intake (litres). (waterIntake)
  4. Frequency of drinking sugary beverages. (sugaryBeverages)
  5. Frequency of alcohol consumption. (alcohol)
  6. Days per week of exercise. (exerciseDays)
  7. Type of exercise usually performed. (exerciseType)
  8. Average duration of each exercise session. (exerciseDuration)
  9. Frequency of physical activities like walking or cycling for commuting. (physicalActivities)
  10. Average hours of sleep per night. (sleepHours)
  11. Frequency of feeling stressed. (stressFrequency)

  This is the conversation history:
  {history}

  This information is currently available in the json file:
  {responses}

  Check the conversation history for any unanswered questions and ensure completeness. Empty fields are either empty strings or null values.

  Iteratively go through the questions and ask the first unanswered one. If any information is missing or incomplete, kindly ask the user to provide the necessary details.

  If the user attempts to divert from the interview topic, politely steer the conversation back to the interview to gather the required information. Ignore queries unrelated to the health insurance premium calculation.

  As soon as all responses are filled in the `;

// Function to create the prompt
function createConversationPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', CONVERSATION_SYSTEM_MESSAGE],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
    ['ai', CONVERSATION_AI_INSTRUCTIONS],
  ]);
}

// Function to initialize the chain
function initializeConversationChain(prompt: ChatPromptTemplate) {
  return prompt.pipe(
    new ChatOpenAI({
      model: config.inferenceModel,
      maxTokens: config.maxTokens,
      temperature: config.modelTemperature,
    }),
  );
}

// Function to handle the chain with history
function fetchConversationChain(
  chain: any,
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

const JSON_SYSTEM_MESSAGE = `
      You are an expert analysing conversation histories.
      Your task is to analyse a conversation between a user and an AI assistant and fill in the JSON structure with all available information. Ensure the JSON structure is complete and accurate.
      This is an exemplary JSON structure where the values are the descriptions of the keys:
      initialResponses =
            fruitsVegetables: 'Frequency of eating fruits and vegetables',
            fastFood: 'Frequency of consuming fast food or junk food',
            waterIntake: 'Daily water intake (litres)',
            sugaryBeverages: 'Frequency of drinking sugary beverages',
            alcohol: 'Frequency of alcohol consumption',
            exerciseDays: 'Days per week of exercise',
            exerciseType: 'Type of exercise usually performed',
            exerciseDuration: 'Average duration of each exercise session',
            physicalActivities: 'Frequency of physical activities like walking or cycling for commuting',
            sleepHours: 'Average hours of sleep per night',
            stressFrequency: 'Frequency of feeling stressed'
      `;

const JSON_AI_INSTRUCTIONS = `
        This is the conversation history:
        {history}

        This is the most recent answer to fill the JSON with:
        {input}

        This is the current JSON file with the available information:
        {responses}.

        Go through the complete conversation history and fill in the JSON structure with all available information. Ensure the JSON is complete and accurate.
        Only return the JSON structure once all the information is filled in.
        `;

function createJsonFillPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', JSON_SYSTEM_MESSAGE],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
    ['ai', JSON_AI_INSTRUCTIONS],
  ]);
}

function initializeJsonFillChain(prompt: any) {
  return prompt.pipe(
    new ChatOpenAI({
      model: config.jsonValidationModel,
      maxTokens: config.maxTokens,
      temperature: config.modelTemperature,
    }).bind({
      response_format: {
        type: 'json_object',
      },
    }),
  );
}

// Function to handle JSON filling chain
function fetchJsonFillChain(chain: any, sessionId: string): RunnableWithMessageHistory<any, any> {
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

// Function to create parallel chains
function fetchParallelRunnableConvoAndJsonFill(
  conversationChain: any,
  jsonFillChain: any,
  sessionId: string,
) {
  const finalChain = RunnableMap.from({
    conversation: fetchConversationChain(conversationChain, sessionId),
    json: fetchJsonFillChain(jsonFillChain, sessionId),
  });
  return finalChain;
}

// Main function to generate chain completion
async function generateCompletion(transcription: string, sessionId: string): Promise<any> {
  try {
    // Load existing responses from MongoDB
    let responses: Responses = ((await getJson(sessionId)) as Responses) || initialResponses;

    console.log('Responses:', responses);

    const conversationPrompt = createConversationPrompt();
    const conversationChain = initializeConversationChain(conversationPrompt);
    const jsonFillPrompt = createJsonFillPrompt();
    const jsonFillChain = initializeJsonFillChain(jsonFillPrompt);
    const parallelChain = fetchParallelRunnableConvoAndJsonFill(
      conversationChain,
      jsonFillChain,
      sessionId,
    );
    const completion = await parallelChain.invoke(
      { input: transcription, responses: responses },
      { configurable: { sessionId } },
    );
    console.log('Completion:', completion);

    responses = completion.json.lc_kwargs.content || initialResponses;

    // Save updated responses to MongoDB
    await saveJson(sessionId, responses);

    return completion.conversation?.lc_kwargs?.content || 'No information available.';
  } catch (error) {
    console.error('Error generating chain completion:', error);
    throw error;
  }
}

// Exporting the main function with traceability
export const generateJsonChainCompletion = traceable(
  async (transcription: string, sessionId: string): Promise<any> => {
    if (config.inferenceModelProvider !== 'openai') {
      throw new Error('This functionality is not yet available for the specified provider.');
    }
    return generateCompletion(transcription, sessionId);
  },
  { name: 'generateJsonChainCompletion' },
);
