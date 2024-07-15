import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from '../config';

const client = new MongoClient(config.mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function saveJson(sessionId: string, jsonData: object): Promise<void> {
  try {
    await client.connect();
    await client
      .db('honesty-experiment')
      .collection('responses')
      .updateOne({ sessionId }, { $set: { data: jsonData } }, { upsert: true });
  } finally {
    await client.close();
  }
}

export async function getJson(sessionId: string): Promise<object | null> {
  try {
    await client.connect();
    const result = await client
      .db('honesty-experiment')
      .collection('responses')
      .findOne({ sessionId });
    return result?.data || null;
  } finally {
    await client.close();
  }
}
