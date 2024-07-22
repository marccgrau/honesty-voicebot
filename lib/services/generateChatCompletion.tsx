import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import Groq from 'groq-sdk';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';

const groq = new Groq();

// Extract configuration constants
const { inferenceModelProvider, inferenceModel, maxTokens, modelTemperature } = config;

// OpenAI Chat Completion
async function generateOpenAICompletion(responseText: string): Promise<string> {
  const chat = new ChatOpenAI({
    model: inferenceModel,
    maxTokens: maxTokens,
    temperature: modelTemperature,
  });
  const message = new HumanMessage(responseText);
  const completion = await chat.invoke([message]);
  return completion?.lc_kwargs?.content || 'No information available.';
}

// Groq Chat Completion
async function generateGroqCompletion(responseText: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          "You are a helpful assistant and only respond in one sentence. If you don't know the answer, rephrase the question that will be passed to the next model.",
      },
      { role: 'user', content: responseText },
    ],
    model: inferenceModel,
    temperature: modelTemperature,
  });
  return completion.choices[0].message.content;
}

// Main function to generate chat completion
async function chatCompletion(responseText: string): Promise<string> {
  let completionText = '';

  try {
    if (inferenceModelProvider === 'openai') {
      completionText = await generateOpenAICompletion(responseText);
    } else if (inferenceModelProvider === 'groq') {
      completionText = await generateGroqCompletion(responseText);
    } else {
      throw new Error('Invalid inference model provider');
    }
  } catch (error) {
    console.error('Error generating chat completion:', error);
    completionText = 'Error generating completion.';
  }

  return completionText;
}

// Exporting the main function with traceability
export const generateChatCompletion = traceable(chatCompletion, {
  name: 'generateChatCompletion',
});
