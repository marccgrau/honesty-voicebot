import dotenv from 'dotenv';

dotenv.config();

const ttsVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

function getRandomTtsVoice() {
  const randomIndex = Math.floor(Math.random() * ttsVoices.length);
  return ttsVoices[randomIndex];
}

export const config = {
  // Inference settings
  inferenceModelProvider: 'openai', // 'groq' or 'openai'
  inferenceModel: 'gpt-4o-mini', // Groq: 'llama3-70b-8192' or 'llama3-8b-8192'.. OpenAI: 'gpt-4-turbo etc
  jsonValidationModel: 'gpt-4o-mini',

  // Whisper settings
  whisperModelProvider: 'groq', // 'groq' or 'openai'
  whisperModel: 'whisper-large-v3', // Groq: 'whisper-large-v3' OpenAI: 'whisper-1'

  // TTS settings
  ttsModelProvider: 'openai', // only openai supported for now...
  ttsModel: 'tts-1', // only openai supported for now...s
  ttsvoice: getRandomTtsVoice(), // only openai supported for now... [alloy, echo, fable, onyx, nova, and shimmer]

  // OPTIONAL:Vision settings
  visionModelProvider: 'google', // 'openai' or 'fal.ai' or 'google'
  visionModel: 'gemini-1.5-flash-latest', // OpenAI: 'gpt-4o' or  Fal.ai: 'llava-next' or  Google: 'gemini-1.5-flash-latest'

  // Function calling + conditionally rendered UI
  functionCallingModelProvider: 'openai', // 'openai' current only
  functionCallingModel: 'gpt-3.5-turbo', // OpenAI: 'gpt-3-5-turbo'

  // UI settings
  enableResponseTimes: false, // Display response times for each message
  enableSettingsUIToggle: true, // Display the settings UI toggle
  enableTextToSpeechUIToggle: true, // Display the text to speech UI toggle
  enableInternetResultsUIToggle: true, // Display the internet results UI toggle
  enableUsePhotUIToggle: false, // Display the use photo UI toggle
  enableChainModeUIToggle: true, // Display the chain mode UI toggle
  enableJsonModeUIToggle: true, // Display the json mode UI toggle
  enableAgentModeUIToggle: false, // Display the agent mode UI toggle
  useAttributionComponent: true, // Use the attribution component to display the attribution of the AI models/services used

  // Rate limiting settings
  useRateLimiting: false, // Use Upstash rate limiting to limit the number of requests per user

  // Tracing with Langchain
  useLangSmith: true, // Use LangSmith by Langchain to trace the execution of the functions in the config.tsx set to true to use.

  // Set model temperature
  modelTemperature: 0.7,

  // Max tokens
  maxTokens: 2048,

  // MongoDB settings
  mongoUri: process.env.MONGODB_URI!,
  dbName: process.env.MONGODB_DBNAME!,
  collectionName: process.env.MONGODB_COLLECTION!,

  // Experiment settings
  QUESTIONNAIRE_CODE: process.env.QUESTIONNAIRE_CODE!,
};
