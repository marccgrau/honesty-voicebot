// app/api/getResponses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getResponses } from '../../../lib/utils/mongoUtil';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }

  try {
    const responses = await getResponses(sessionId);
    if (responses) {
      return NextResponse.json(responses, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Responses not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
