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

const CONVERSATION_SYSTEM_MESSAGE = `
You are a polite interviewer conducting an interview to gather information for calculating a health insurance premium.
Ensure all questions are answered thoroughly.
You will receive a description of the required information, the conversation history, and a JSON file with the responses collected so far.
If an answer is missing, the value will be 'N/A', an empty string, or null.
`;

const CONVERSATION_AI_INSTRUCTIONS = `
**Requirements:**
To calculate the health insurance premium, please gather the following information:

1. How often do you eat fruits and vegetables?
2. How often do you consume fast food or junk food?
3. How many glasses of water do you drink per day?
4. How often do you drink sugary beverages?
5. How often do you consume alcohol?
6. How many days per week do you exercise?
7. On average, how long is each exercise session?
8. How often do you engage in physical activities such as walking or cycling for commuting?
9. How many hours of sleep do you get on average per night?
10. How often do you feel stressed?

**Available Information:**
The following information is currently available:
{responses}

This is the current user input:
{input}

**Interview Process:**
1. Review the conversation history for any unanswered questions and ensure completeness. Empty fields are marked as 'N/A', empty strings, or null values.
2. Ask the next question where no answer is recorded. If any information is missing or incomplete, kindly ask the user to provide the necessary details.
3. Do not repeat questions that already have responses.

**Guidelines:**
- Ask questions in a natural, conversational manner without using numbers or mentioning the corresponding keys.
- Politely steer the conversation back if the user diverts from the interview topic.
- Thank the user for their participation and time once all responses are complete in the JSON file.

**Restrictions:**
- Do not address queries unrelated to the health insurance premium calculation.
- Avoid repeating questions that already have answers.
`;

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

**Exemplary JSON Structure:**
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
`;

const JSON_AI_INSTRUCTIONS = `
**Conversation History:**
{history}

**Most Recent Answer:**
{input}

**Most Recent JSON File with responses:**
{responses}

**Instructions:**
1. **Field Verification:**
   - Check if each field in the JSON structure has been filled with a relevant answer.
2. **Missing Information:**
   - For each missing or incomplete field, find the relevant answer in the conversation history.
3. **Update Fields:**
   - If the most recent answer provides information for a field, update that field in the JSON structure.
4. **Completion Check:**
   - Ensure all fields are filled appropriately, and the JSON structure is accurate and complete.
5. **Return JSON:**
   - Only return the JSON structure once all the information is filled in.
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

    responses = completion.json?.lc_kwargs?.content || initialResponses;

    // Save updated responses to MongoDB
    saveJson(sessionId, responses);

    // TODO: format the responses for display
    // TODO: make sure to only ask questions

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
