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
  exerciseType: string;
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
  exerciseType: '',
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
    default: () => ({
      fruitsVegetables: '',
      fastFood: '',
      waterIntake: '',
      sugaryBeverages: '',
      alcohol: '',
      exerciseDays: '',
      exerciseDuration: '',
      physicalActivities: '',
      sleepHours: '',
      stressFrequency: '',
    }),
  },
};

const model = new ChatOpenAI({
  modelName: config.inferenceModel,
  maxTokens: config.maxTokens,
  temperature: config.modelTemperature,
});

// Function to create a prompt for a specific question
const createQuestionPrompt = (question: string) =>
  ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a polite interviewer conducting an interview to gather information for calculating a health insurance premium. Ensure all questions are answered thoroughly.`,
    ],
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

// Function to create a node for a specific question
const createQuestionNode =
  (questionKey: string, questionText: string) => async (state: AgentState) => {
    const prompt = createQuestionPrompt(questionText);
    const questionChain = prompt.pipe(model);

    // Invoke the chain and extract the response content
    const response = await questionChain.invoke({ messages: state.messages });
    const userMessageContent = response.lc_kwargs?.content || '';

    // Record the response in the state
    const userMessage = new HumanMessage(userMessageContent);
    state.responses[questionKey] = userMessageContent;
    state.messages.push(userMessage);

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
  })
  // Start the workflow at the welcome node
  .addEdge(START, 'welcome')
  // Add each question node explicitly
  .addNode(
    'fruitsVegetables',
    createQuestionNode('fruitsVegetables', 'How often do you eat fruits and vegetables?'),
  )
  .addNode(
    'fastFood',
    createQuestionNode('fastFood', 'How often do you consume fast food or junk food?'),
  )
  .addNode(
    'waterIntake',
    createQuestionNode('waterIntake', 'How many glasses of water do you drink per day?'),
  )
  .addNode(
    'sugaryBeverages',
    createQuestionNode('sugaryBeverages', 'How often do you drink sugary beverages?'),
  )
  .addNode('alcohol', createQuestionNode('alcohol', 'How often do you consume alcohol?'))
  .addNode(
    'exerciseDays',
    createQuestionNode('exerciseDays', 'How many days per week do you exercise?'),
  )
  .addNode(
    'exerciseDuration',
    createQuestionNode('exerciseDuration', 'On average, how long is each exercise session?'),
  )
  .addNode(
    'sleepHours',
    createQuestionNode('sleepHours', 'How many hours of sleep do you get on average per night?'),
  )
  .addNode(
    'stressFrequency',
    createQuestionNode('stressFrequency', 'How often do you feel stressed?'),
  )
  // Add a completion check node
  .addNode('checkCompletion', async (state: AgentState) => {
    const allAnswered = questions.every(({ key }) => state.responses[key]);
    if (allAnswered) {
      state.messages.push(new AIMessage('Thank you for your participation and time.'));
    }
    return state;
  })
  // Link the nodes in the order of the questions
  .addEdge('welcome', 'fruitsVegetables')
  .addEdge('fruitsVegetables', 'fastFood')
  .addEdge('fastFood', 'waterIntake')
  .addEdge('waterIntake', 'sugaryBeverages')
  .addEdge('sugaryBeverages', 'alcohol')
  .addEdge('alcohol', 'exerciseDays')
  .addEdge('exerciseDays', 'exerciseDuration')
  .addEdge('exerciseDuration', 'sleepHours')
  .addEdge('sleepHours', 'stressFrequency')
  .addEdge('stressFrequency', 'checkCompletion')
  .addEdge('checkCompletion', END);

// Compile the workflow with a memory saver as the checkpointer
const app = workflow.compile({ checkpointer: new MemorySaver() });

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

    // Invoke the workflow with the initial state
    const finalState = await app.invoke(state, { configurable: { thread_id: sessionId } });

    // Save updated responses to MongoDB
    await saveJson(sessionId, finalState.responses);

    return finalState.messages.map((message: string) => message).join('\n');
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
