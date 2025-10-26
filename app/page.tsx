'use client';

import { useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';

interface StressData {
  prediction: string;
  confidence: {
    [key: string]: number;
  };
}

interface ThemeData {
  themes: [string, number][];
}

const COLORS = ['#7ab699ff', '#cabea5ff', '#ded9acff'];

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [stressLabel, setStressLabel] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [themes, setThemes] = useState<[string, number][]>([]);
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState('');
  const [showNoStress, setShowNoStress] = useState(false);

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setError('Write something about what you are feeling right now.');
      return;
    }

    setError('');
    setLoading(true);
    setStressLabel('');
    setThemes([]);
    setRecommendation('');
    setShowNoStress(false);

    try {
      // Call stress prediction API via our proxy
      const stressResponse = await axios.post<StressData>(
        '/api/predict-stress',
        { prompt }
      );

      if (stressResponse.status === 200) {
        const stressData = stressResponse.data;
        let label = stressData.prediction || 'unknown';
        const stressConfidences = stressData.confidence || {};
        const conf = stressConfidences[label] || 0;

        if (label === 'Normal') {
          label = 'No Stress';
          setShowNoStress(true);
          setStressLabel(label);
          setConfidence(conf);
          setLoading(false);
          return;
        }

        setStressLabel(label);
        setConfidence(conf);

        // Call theme prediction API via our proxy
        const themeResponse = await axios.post<ThemeData>(
          '/api/predict-theme',
          { prompt, multi_label: true }
        );

        if (themeResponse.status === 200) {
          const themeData = themeResponse.data;
          const detectedThemes = themeData.themes || [];
          setThemes(detectedThemes);

          if (detectedThemes.length > 0) {
            const topTheme = detectedThemes[0][0];

            // Get recommendation from our API
            const recResponse = await axios.post('/api/recommendation', {
              theme: topTheme,
            });

            if (recResponse.status === 200) {
              setRecommendation(recResponse.data.recommendation);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error in API call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

const renderPieChart = () => {
  if (themes.length <= 1) return null;

  const topThemes = themes.slice(0, 3);
  const chartData = topThemes.map(([name, value]) => ({
    name,
    value: Number(value), // Ensure value is a number
  }));

  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <div className="w-full" style={{ height: '400px' }}> {/* Add fixed height */}
      <h3 className="text-xl font-semibold mb-4 text-left">Detected Themes:</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={true} // Enable label lines
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80} // Reduced radius for better fit
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
                strokeWidth={2}
                style={{
                  filter: entry.value === maxValue ? 'brightness(1.1)' : 'none',
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat"
         style={{
           backgroundImage: 'url("https://img.freepik.com/free-vector/blank-white-leafy-background_53876-100817.jpg?t=st=1757591495~exp=1757595095~hmac=f6c2a51f11d736c6999282c680f8b191e04c50d850e23d7a1cf03a82f44ec334&w=2000")'
         }}>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl text-black mx-auto bg-white/80 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold mb-2">Stress Sense Companion</h1>
          <h3 className="text-xl mb-6">What&apos;s on your mind? What&apos;s going on in your life?</h3>

          <textarea
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d3e3dbff] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write here..."
          />

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 px-6 py-3 bg-[#7ab699ff] text-white rounded-lg hover:bg-[#69a588] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analyzing...' : 'Spot the Stress'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              {error}
            </div>
          )}

          {stressLabel && (
            <div className="mt-6">
              <h3 className="text-2xl font-semibold">
                Spotted: <span className="font-bold">{stressLabel.toUpperCase()}</span>{' '}
                <span className="text-lg">(Confidence: {(confidence * 100).toFixed(1)}%)</span>
              </h3>
            </div>
          )}

          {showNoStress && (
            <div className="mt-6 flex justify-center">
              <img src="/unicorn.png" alt="No stress detected" className="max-w-md" />
            </div>
          )}

          {!showNoStress && themes.length > 0 && (
            <>
              {renderPieChart()}

              <div className="mt-6">
                <h3 className="text-xl font-semibold">
                  Main Theme: <span className="font-bold">{themes[0][0].charAt(0).toUpperCase() + themes[0][0].slice(1)}</span>
                </h3>
              </div>

              {recommendation && (
                <div className="mt-6 p-4 bg-[#d3e3dbff] rounded-lg prose prose-sm max-w-none">
                  <ReactMarkdown>{recommendation}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
