import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from '../config';
import { Responses } from '../utils/generateJsonChainCompletion';

// Create a MongoClient instance and connect once
const client = new MongoClient(config.mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db: any;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('honesty-experiment');
  }
  return db;
}

export async function saveJson(sessionId: string, jsonData: Responses): Promise<void> {
  try {
    const database = await connectDB();
    await database
      .collection('responses')
      .updateOne(
        { sessionId },
        { $set: { data: JSON.parse(JSON.stringify(jsonData)) } },
        { upsert: true },
      );
  } catch (error) {
    console.error('Error saving JSON to MongoDB:', error);
    throw error;
  }
}

function validateResponses(data: any): data is Responses {
  const requiredKeys: Array<keyof Responses> = [
    'fruitsVegetables',
    'fastFood',
    'waterIntake',
    'sugaryBeverages',
    'alcohol',
    'exerciseDays',
    'exerciseDuration',
    'sleepHours',
    'stressFrequency',
  ];
  return requiredKeys.every((key) => typeof data[key] === 'string');
}

export async function getJson(sessionId: string): Promise<Responses | null> {
  try {
    const database = await connectDB();
    const result = await database.collection('responses').findOne({ sessionId });
    console.log('data from mongo', result);
    if (result && result.data) {
      const parsedData = JSON.parse(result.data);
      if (validateResponses(parsedData)) {
        return parsedData as Responses;
      } else {
        console.error('Invalid data structure:', result);
        return null;
      }
    } else {
      console.error('Invalid data structure:', result);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving JSON from MongoDB:', error);
    throw error;
  }
}

// Function to close the database connection
async function closeDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

// Register process event listeners for graceful shutdown
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

process.on('exit', async () => {
  await closeDB();
});
