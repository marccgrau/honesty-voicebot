// pages/api/getResponses.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getResponses } from '../../lib/utils/mongoUtil';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Invalid sessionId' });
    return;
  }

  try {
    const responses = await getResponses(sessionId);
    if (responses) {
      res.status(200).json(responses);
    } else {
      res.status(404).json({ error: 'Responses not found' });
    }
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
