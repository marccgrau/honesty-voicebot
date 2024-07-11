import { ChatOpenAI } from '@langchain/openai';
import Groq from 'groq-sdk';
import { config } from '../config';
import { traceable } from 'langsmith/traceable';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableConfig, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';

export const generateChainCompletion = traceable(async (responseText: string) => {
  let completion;
  const prompt = ChatPromptTemplate.fromMessages([
    ['ai', 'You are a helpful assistant'],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);
  const chain = prompt.pipe(
    new ChatOpenAI({
      temperature: 0,
      model: config.inferenceModel,
      maxTokens: config.maxTokens,
    }),
  );
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sessionId) =>
      new UpstashRedisChatMessageHistory({
        sessionId,
        config: {
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        },
      }),
    inputMessagesKey: 'input',
    historyMessagesKey: 'history',
  });
  completion = await chainWithHistory.invoke(
    {
      input: responseText,
    },
    {
      configurable: {
        sessionId: 'foobarbaz',
      },
    },
  );
});
