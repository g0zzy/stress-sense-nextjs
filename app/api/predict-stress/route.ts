import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.STRESS_API_BASE_URL;
    const apiSecret = process.env.STRESS_API_SECRET;

    if (!apiUrl) {
      return NextResponse.json(
        { error: 'API URL not configured' },
        { status: 500 }
      );
    }

    // Call the stress prediction API
    const response = await axios.get(
      `${apiUrl}/predict_stress_dl`,
      {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication header if API secret is configured
          ...(apiSecret && { 'X-API-Key': apiSecret }),
        },
        params: { prompt },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error calling stress prediction API:', error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data?.message || 'Failed to predict stress' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to predict stress' },
      { status: 500 }
    );
  }
}
