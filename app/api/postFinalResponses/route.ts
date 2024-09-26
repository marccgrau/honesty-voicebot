import { NextRequest, NextResponse } from 'next/server';
import { saveFinalResponses } from '../../../lib/utils/mongoUtil';
import { Responses } from '../../../types/responses';

export async function POST(req: NextRequest) {
  const { sessionId, prolificPid, userId, ttsVoice, responses } = await req.json();

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }

  if (!responses || typeof responses !== 'object') {
    return NextResponse.json({ error: 'Invalid responses' }, { status: 400 });
  }

  try {
    await saveFinalResponses(sessionId, prolificPid, userId, ttsVoice, responses as Responses);
    return NextResponse.json({ message: 'Final responses saved successfully' });
  } catch (error) {
    console.error('Error saving final responses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
