import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory, RunnableMap } from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';
import { saveResponses, getResponses } from '../utils/mongoUtil';
import { Responses, Response } from '../../types/responses';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables are not set.');
}

const initialResponses: Responses = {
  fruitsAndVegetablesPerDay: '',
  fastFoodPerWeek: '',
  waterIntakePerDay: '',
  sugaryBeveragesPerDay: '',
  alcoholPerWeek: '',
  exerciseDaysPerWeek: '',
  averageExerciseDurationInMinutes: '',
  sleepHoursPerNight: '',
  stressFrequencyPerWeek: '',
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
- Talk politely, and ask the questions with respect to the temporal context.
- If you get "All questions have been answered." instead of a next question, thank the user for his time and end the conversation. Only finish the conversation if you get this message.
- Do not engage in any other conversation after all questions have been answered.
- Do not summarize the results at the end of the conversation.
`;

class QuestionManager {
  private questions: { [key in keyof Responses]: Response };

  constructor() {
    this.questions = {
      fruitsAndVegetablesPerDay: {
        question: 'How many fruits or vegetables do you eat per day?',
        answer: '',
      },
      fastFoodPerWeek: {
        question: 'On how many days do you consume fast food or junk food in a week?',
        answer: '',
      },
      waterIntakePerDay: {
        question: 'How many glasses of water do you drink per day?',
        answer: '',
      },
      sugaryBeveragesPerDay: {
        question: 'How many glasses of sugary beverages do you drink per day?',
        answer: '',
      },
      alcoholPerWeek: {
        question: 'On how many days do you consume alcohol in a week?',
        answer: '',
      },
      exerciseDaysPerWeek: { question: 'How many days per week do you exercise?', answer: '' },
      averageExerciseDurationInMinutes: {
        question: 'On average in minutes, how long is a typical exercise session when you train?',
        answer: '',
      },
      sleepHoursPerNight: {
        question: 'How many hours of sleep do you get on average per night?',
        answer: '',
      },
      stressFrequencyPerWeek: {
        question: 'On how many days do you feel stressed in a week?',
        answer: '',
      },
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
      fruitsAndVegetablesPerDay: '',
      fastFoodPerWeek: '',
      waterIntakePerDay: '',
      sugaryBeveragesPerDay: '',
      alcoholPerWeek: '',
      exerciseDaysPerWeek: '',
      averageExerciseDurationInMinutes: '',
      sleepHoursPerNight: '',
      stressFrequencyPerWeek: '',
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
  "fruitsAndVegetablesPerDay": "Daily number of eaten fruits and vegetables",
  "fastFoodPerWeek": "Weekly frequency of consuming fast food or junk food (number of days)",
  "waterIntakePerDay": "Daily water intake in number of glasses",
  "sugaryBeveragesPerDay": "Daily intake sugary beverages in number of glasses",
  "alcoholPerWeek": "Weekly frequency of alcohol consumption (number of days)",
  "exerciseDaysPerWeek": "Days per week of exercise (number of days)",
  "averageExerciseDurationInMinutes": "Average duration of each exercise session in minutes",
  "sleepHoursPerNight": "Average hours of sleep per night",
  "stressFrequencyPerWeek": "Weekly frequency of feeling stressed (number of days)"
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
   - Make sure to only extract measurable units as defined in the questions and return them as strings.
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

// Main function to generate json chain completion
async function generateCompletion(
  transcription: string,
  sessionId: string,
  prolificPid: string,
  ttsVoice: string,
): Promise<any> {
  try {
    // Load existing responses from MongoDB
    let responses: Responses = ((await getResponses(sessionId)) as Responses) || initialResponses;

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
    await saveResponses(sessionId, prolificPid, ttsVoice, responses);

    if (nextQuestion === 'All questions have been answered.') {
      return {
        responseText: completion.conversation?.lc_kwargs?.content || 'No information available.',
        allQuestionsAnswered: true,
      };
    }

    return {
      responseText: completion.conversation?.lc_kwargs?.content || 'No information available.',
      allQuestionsAnswered: false,
    };
  } catch (error) {
    console.error('Error generating chain completion:', error);
    throw error;
  }
}

// Exporting the main function with traceability
export const generateJsonChainCompletion = traceable(
  async (
    transcription: string,
    sessionId: string,
    prolificPid: string,
    ttsVoice: string,
  ): Promise<any> => {
    if (config.inferenceModelProvider !== 'openai') {
      throw new Error('This functionality is not yet available for the specified provider.');
    }
    return generateCompletion(transcription, sessionId, prolificPid, ttsVoice);
  },
  { name: 'generateJsonChainCompletion' },
);
