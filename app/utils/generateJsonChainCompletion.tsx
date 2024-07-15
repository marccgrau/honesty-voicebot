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

1. How often do you eat fruits and vegetables? (fruitsVegetables)
   - Daily
   - 3-5 times a week
   - 1-2 times a week
   - Rarely
   - Never
2. How often do you consume fast food or junk food? (fastFood)
   - Daily
   - 3-5 times a week
   - 1-2 times a week
   - Rarely
   - Never
3. How many glasses of water do you drink per day? (waterIntake)
   - 8 or more
   - 5-7
   - 3-4
   - 1-2
   - None
4. How often do you drink sugary beverages? (sugaryBeverages)
   - Daily
   - 3-5 times a week
   - 1-2 times a week
   - Rarely
   - Never
5. How often do you consume alcohol? (alcohol)
   - Daily
   - 3-5 times a week
   - 1-2 times a week
   - Rarely
   - Never
6. How many days per week do you exercise? (exerciseDays)
   - 7 days
   - 5-6 days
   - 3-4 days
   - 1-2 days
   - None
7. What type of exercise do you usually perform? (exerciseType)
   - Cardio (running, cycling, etc.)
   - Strength training (weightlifting, resistance exercises, etc.)
   - Flexibility exercises (yoga, stretching, etc.)
   - Sports (basketball, football, etc.)
   - Other
8. On average, how long is each exercise session? (exerciseDuration)
   - Less than 30 minutes
   - 30-60 minutes
   - 1-2 hours
   - More than 2 hours
9. How often do you engage in physical activities such as walking or cycling for commuting? (physicalActivities)
   - Daily
   - 3-5 times a week
   - 1-2 times a week
   - Rarely
   - Never
10. How many hours of sleep do you get on average per night? (sleepHours)
   - Less than 4 hours
   - 4-6 hours
   - 6-8 hours
   - More than 8 hours
11. How often do you feel stressed? (stressFrequency)
   - Always
   - Often
   - Sometimes
   - Rarely
   - Never

This information is currently available in the JSON file:
{responses}

Check the conversation history for any unanswered questions and ensure completeness. Empty fields are either N/A, empty strings or null values.

Iteratively go through the responses and ask the first question where no answer is recorded. If any information is missing or incomplete, kindly ask the user to provide the necessary details.

If the user attempts to divert from the interview topic, politely steer the conversation back to the interview to gather the required information. Ignore queries unrelated to the health insurance premium calculation.

As soon as all responses are filled in the JSON file, end the conversation by thanking the user for their participation and time.`;

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
You are an expert at analyzing conversation histories.
Your task is to analyze a conversation between a user and an AI assistant and fill in the JSON structure with all available information. Ensure the JSON structure is complete and accurate.
This is an exemplary JSON structure where the values are the descriptions of the keys:
{
  "fruitsVegetables": "Frequency of eating fruits and vegetables",
  "fastFood": "Frequency of consuming fast food or junk food",
  "waterIntake": "Daily water intake (litres)",
  "sugaryBeverages": "Frequency of drinking sugary beverages",
  "alcohol": "Frequency of alcohol consumption",
  "exerciseDays": "Days per week of exercise",
  "exerciseType": "Type of exercise usually performed",
  "exerciseDuration": "Average duration of each exercise session",
  "physicalActivities": "Frequency of physical activities like walking or cycling for commuting",
  "sleepHours": "Average hours of sleep per night",
  "stressFrequency": "Frequency of feeling stressed"
}
`;

const JSON_AI_INSTRUCTIONS = `
This is the conversation history:
{history}

This is the most recent answer to fill the JSON with:
{input}

This is the current JSON file with the available information:
{responses}.

Go through the complete conversation history and fill in the JSON structure with all available information. Ensure the JSON is complete and accurate. Only return the JSON structure once all the information is filled in.

Instructions:
1. Check if each field in the JSON structure has been filled with a relevant answer.
2. For each missing or incomplete field, find the relevant answer in the conversation history.
3. If the most recent answer provides information for a field, update that field in the JSON structure.
4. Ensure all fields are filled appropriately, and the JSON structure is accurate and complete.
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
