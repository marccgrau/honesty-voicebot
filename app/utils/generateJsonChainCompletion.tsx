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

export interface Responses {
  fruitsVegetables: string;
  fastFood: string;
  waterIntake: string;
  sugaryBeverages: string;
  alcohol: string;
  exerciseDays: string;
  exerciseDuration: string;
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
  exerciseDuration: '',
  sleepHours: '',
  stressFrequency: '',
};

const CONVERSATION_SYSTEM_MESSAGE = `
You are a polite interviewer conducting an interview to gather information for calculating a health insurance premium.
You will receive the conversation history and the next question to ask the user in a conversational manner.
If there are no more questions to ask, you will receive a message stating "All questions have been answered.".
If all questions have been answered, thank the user for his time and end the conversation.
`;

const CONVERSATION_AI_INSTRUCTIONS = `
This is the conversation that has been conducted so far:
{history}

Ask the user the following question:
{question}

**Instructions:**
- Do not repeat already answered questions.
- If there are any open questions, ask them in a conversational manner.
- Talk politely.
- If you get "All questions have been answered." instead of a next question, thank the user for his time and end the conversation.
- Do not engage in any other conversation after all questions have been answered.
`;

interface Response {
  question: string;
  answer: string;
}

class QuestionManager {
  private questions: { [key in keyof Responses]: Response };

  constructor() {
    this.questions = {
      fruitsVegetables: {
        question: 'How many fruits or vegetables do you eat per day?',
        answer: '',
      },
      fastFood: {
        question: 'How often do you consume fast food or junk food per week?',
        answer: '',
      },
      waterIntake: { question: 'How many glasses of water do you drink per day?', answer: '' },
      sugaryBeverages: {
        question: 'How many glasses of sugary beverages do you drink per day?',
        answer: '',
      },
      alcohol: { question: 'How often do you consume alcohol per week?', answer: '' },
      exerciseDays: { question: 'How many days per week do you exercise?', answer: '' },
      exerciseDuration: {
        question: 'On average, how long is a typical exercise session when you train?',
        answer: '',
      },
      sleepHours: {
        question: 'How many hours of sleep do you get on average per night?',
        answer: '',
      },
      stressFrequency: { question: 'How often do you feel stressed in a week?', answer: '' },
    };
  }

  loadResponses(responses: Responses) {
    for (const key of Object.keys(responses) as Array<keyof Responses>) {
      if (this.questions[key]) {
        this.questions[key].answer = responses[key];
      } else {
        console.error(`Invalid key in responses: ${key}`);
      }
    }
  }

  getUnansweredQuestions(): { key: keyof Responses; question: string }[] {
    return Object.entries(this.questions)
      .filter(
        ([_, { answer }]) => !answer || answer.trim() === '' || answer.toLowerCase() === 'n/a',
      )
      .map(([key, { question }]) => ({ key: key as keyof Responses, question }));
  }

  getRandomUnansweredQuestion(): string {
    const unansweredQuestions = this.getUnansweredQuestions();
    console.log('Unanswered Questions:', unansweredQuestions);
    if (unansweredQuestions.length === 0) {
      return 'All questions have been answered.';
    }
    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    return unansweredQuestions[randomIndex].question;
  }

  getResponses(): Responses {
    const responses: Responses = {
      fruitsVegetables: '',
      fastFood: '',
      waterIntake: '',
      sugaryBeverages: '',
      alcohol: '',
      exerciseDays: '',
      exerciseDuration: '',
      sleepHours: '',
      stressFrequency: '',
    };
    for (const key of Object.keys(this.questions) as Array<keyof Responses>) {
      responses[key] = this.questions[key].answer;
    }
    return responses;
  }
}

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
  "fruitsVegetables": "Daily amount of eaten fruits and vegetables",
  "fastFood": "Weekly frequency of consuming fast food or junk food",
  "waterIntake": "Daily water intake (glasses)",
  "sugaryBeverages": "Daily intake sugary beverages (glasses)",
  "alcohol": "Weekly frequency of alcohol consumption",
  "exerciseDays": "Days per week of exercise",
  "exerciseDuration": "Average duration of each exercise session",
  "sleepHours": "Average hours of sleep per night",
  "stressFrequency": "Weekly frequency of feeling stressed"
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
2. **Update Information:**
   - For each missing, incomplete or unanswered field, scan through the conversation history and current answer to find an answer if possible.
4. **Measurability:**
   - Make sure to extract measurable information for each field.
5. **Completion Check:**
   - Ensure all fields are filled appropriately, and the JSON structure is accurate and complete.
6. **Correction:**
   - If any provided information does not match the description, leave the field empty or with the value 'N/A'.
6. **Return JSON:**
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

// TODO: add message history filtering

// Main function to generate chain completion
async function generateCompletion(transcription: string, sessionId: string): Promise<any> {
  try {
    // Load existing responses from MongoDB
    let responses: Responses = ((await getJson(sessionId)) as Responses) || initialResponses;

    console.debug('Responses:', responses);

    const questionManager = new QuestionManager();
    questionManager.loadResponses(responses);

    const nextQuestion = questionManager.getRandomUnansweredQuestion();
    console.log('Next Question:', nextQuestion);

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
      { input: transcription, responses: responses, question: nextQuestion },
      { configurable: { sessionId } },
    );
    console.debug('Completion:', completion);

    responses = completion.json?.lc_kwargs?.content || initialResponses;

    // Save updated responses to MongoDB
    saveJson(sessionId, responses);

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
