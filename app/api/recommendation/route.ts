import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json();

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Give me a bite-sized recommendations on ${theme}.

It should not be longer than 2 sentences and keep it practical and casual.

Here is an example recommendation format for the theme "work stress":
**Desk Reset · ~2 min**
    - Clear 3 things off your desk.
    - Place water within reach.
    **Why:** tidy space = calmer brain.

Keep the format in Markdown as above.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.0,
      },
      systemInstruction: 'You are a supportive, evidence-informed mental-health assistant that provides bite-sized, practical tips for relieving people\'s stress.',
    });

    const response = result.response;
    const text = response.text();

    return NextResponse.json({ recommendation: text });
  } catch (error) {
    console.error('Error generating recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}
