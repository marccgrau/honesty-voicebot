import { config } from '../config';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { END, MemorySaver, StateGraph, StateGraphArgs, START } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { saveJson, getJson } from './mongoUtil';
import { traceable } from 'langsmith/traceable';

// Define the state interface which includes both messages and responses
interface AgentState {
  messages: BaseMessage[];
  responses: Record<string, string>;
}

interface Responses extends Record<string, string> {
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

// Initial responses
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

// Define the graph state, specifying how to handle messages and responses
const graphState: StateGraphArgs<AgentState>['channels'] = {
  messages: {
    value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  },
  responses: {
    value: (x: Record<string, string>, y: Record<string, string>) => ({ ...x, ...y }),
    default: () => initialResponses,
  },
};

const model = new ChatOpenAI({
  modelName: config.inferenceModel,
  maxTokens: config.maxTokens,
  temperature: config.modelTemperature,
});

// Function to create a prompt for a specific question
const createQuestionPrompt = (state: AgentState, question: string) =>
  ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a polite interviewer conducting an interview to gather information for calculating a health insurance premium. Ensure all questions are answered thoroughly.
      First you get the last user input, then you receive the next question you should ask.`,
    ],
    ['system', 'The following responses are currently already available:'],
    ['system', JSON.stringify(state.responses)],
    new MessagesPlaceholder('messages'),
    ['ai', question],
  ]);

// List of questions to be asked during the interview
const questions = [
  { key: 'fruitsVegetables', question: 'How often do you eat fruits and vegetables?' },
  { key: 'fastFood', question: 'How often do you consume fast food or junk food?' },
  { key: 'waterIntake', question: 'How many glasses of water do you drink per day?' },
  { key: 'sugaryBeverages', question: 'How often do you drink sugary beverages?' },
  { key: 'alcohol', question: 'How often do you consume alcohol?' },
  { key: 'exerciseDays', question: 'How many days per week do you exercise?' },
  { key: 'exerciseDuration', question: 'On average, how long is each exercise session?' },
  { key: 'sleepHours', question: 'How many hours of sleep do you get on average per night?' },
  { key: 'stressFrequency', question: 'How often do you feel stressed?' },
];

// Function to get the first unanswered question
const getFirstUnansweredQuestion = (responses: Record<string, string>) => {
  for (const { key, question } of questions) {
    if (!responses[key]) {
      return { key, question };
    }
  }
  return null;
};

// Function to create a node that asks the next question
const questionNode = async (state: AgentState): Promise<AgentState | typeof END> => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage instanceof HumanMessage) {
    const lastInput = lastMessage.lc_kwargs?.content;

    // Find the last asked question
    const lastAskedQuestion = questions.find(
      ({ question }) => state.messages[state.messages.length - 2]?.content === question,
    );

    if (lastAskedQuestion) {
      // Save the last input to the appropriate response
      state.responses[lastAskedQuestion.key] = lastInput;
    }

    const firstUnanswered = getFirstUnansweredQuestion(state.responses);

    if (firstUnanswered) {
      const prompt = createQuestionPrompt(state, firstUnanswered.question);
      const questionChain = prompt.pipe(model);

      // Invoke the chain and extract the response content
      const response = await questionChain.invoke({ messages: state.messages });
      const userMessageContent = response.lc_kwargs?.content || '';

      // Record the response in the state
      const userMessage = new HumanMessage(userMessageContent);
      state.messages.push(userMessage);

      return state;
    } else {
      state.messages.push(new AIMessage('Thank you for your participation and time.'));
      return END;
    }
  }
  return state;
};

// Initialize the state graph with the defined channels
const workflow = new StateGraph<AgentState>({ channels: graphState })
  // Add a welcome node that introduces the interview
  .addNode('welcome', async (state: AgentState) => {
    state.messages.push(
      new AIMessage("Welcome to the interview. Let's start with some questions."),
    );
    return state;
  });
// Add the question node

// TODO: add human-in-the-loop to provide answers
// //   .addNode('questionNode', questionNode)
//   // Add edges
//   .addEdge(START, 'welcome')
//   .addEdge('welcome', 'questionNode')
//   .addEdge('questionNode', 'questionNode')
//   .addEdge('questionNode', END);

// Compile the workflow with a memory saver as the checkpointer
const app = workflow.compile({ checkpointer: new MemorySaver() });

console.log('App compiled:', app);

// Function to generate chain completion
async function generateCompletion(transcription: string, sessionId: string): Promise<any> {
  try {
    // Load existing responses from MongoDB
    let responses: Responses = ((await getJson(sessionId)) as Responses) || initialResponses;

    console.debug('Responses:', responses);

    const state: AgentState = {
      messages: [new HumanMessage(transcription)],
      responses: responses,
    };

    console.log('Initial state:', state);

    // Invoke the workflow with the initial state
    const finalState = await app.invoke(state, { configurable: { thread_id: sessionId } });

    // Save updated responses to MongoDB
    await saveJson(sessionId, finalState.responses);

    // Find the next question to ask
    const firstUnanswered = getFirstUnansweredQuestion(finalState.responses);

    if (firstUnanswered) {
      return firstUnanswered.question;
    }

    // If no questions are left, return the thank you message
    return 'Thank you for your participation and time.';
  } catch (error) {
    console.error('Error generating chain completion:', error);
    throw error;
  }
}

// Exporting the main function with traceability
export const generateAgentCompletion = traceable(
  async (transcription: string, sessionId: string): Promise<any> => {
    if (config.inferenceModelProvider !== 'openai') {
      throw new Error('This functionality is not yet available for the specified provider.');
    }
    return generateCompletion(transcription, sessionId);
  },
  { name: 'generateAgentCompletion' },
);
