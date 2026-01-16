/**
 * SummaryOptionAnalysisTab - Detailed Question Analysis Component
 * 
 * This component provides a detailed analysis of exam questions, including response statistics,
 * response distribution chart, and quality indicators (difficulty, discrimination, point-biserial).
 * 
 * Features:
 * - Response analysis table with frequency, percentage, and point-biserial correlation
 * - Response distribution bar chart showing option frequencies
 * - Quality indicators (difficulty, discrimination, point-biserial)
 * - Statistical significance analysis
 * 
 * @param {QuestionAnalysisCardProps} props - Component props containing question analysis data
 * @param {QuestionAnalysisResult} props.question - The analysis result for the question
 * @param {number} props.questionNumber - The sequential number of the question in the exam
 *  
 * @returns {JSX.Element} A React component displaying detailed question analysis
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AnalysisDisplayProps, QuestionAnalysisCardProps } from '../../../../../types/analysis';
import { getQualityIndicator } from '../../../../../components/analytics/helpers';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);



/**
 * Displays a detailed analysis card for a single exam question, including response statistics, 
 * response distribution chart, and quality indicators. biserial, discrimination, difficulty, statistical significance
 *
 * @param question - The analysis result for the question, including distractor and statistical data.
 * @param questionNumber - The sequential number of the question in the exam.
 * @returns React component rendering tables, charts, and statistics for the question.
 */
function QuestionAnalysisCard({ question, questionNumber }: QuestionAnalysisCardProps) {
  // Prepare data for response frequency table
  const responseData: Array<{
    option: string;
    frequency: number;
    percentage: number;
    pointBiserial: number;
    isCorrect: boolean;
  }> = [];

  // Add correct option
  if (question.distractorAnalysis.correctOption) {
    responseData.push({
      option: question.distractorAnalysis.correctOption.option,
      frequency: question.distractorAnalysis.correctOption.frequency,
      percentage: question.distractorAnalysis.correctOption.percentage,
      pointBiserial: question.distractorAnalysis.correctOption.pointBiserialCorrelation,
      isCorrect: true,
    });
  }

  // Add distractor options
  question.distractorAnalysis.distractors.forEach(distractor => {
    responseData.push({
      option: distractor.option,
      frequency: distractor.frequency,
      percentage: distractor.percentage,
      pointBiserial: distractor.pointBiserialCorrelation,
      isCorrect: false,
    });
  });

  // Add omitted responses if any
  if (question.distractorAnalysis.omittedResponses > 0) {
    responseData.push({
      option: 'Omitted',
      frequency: question.distractorAnalysis.omittedResponses,
      percentage: question.distractorAnalysis.omittedPercentage,
      pointBiserial: 0,
      isCorrect: false,
    });
  }

  // Sort by option for consistent display
  responseData.sort((a, b) => {
    if (a.option === 'Omitted') return 1;
    if (b.option === 'Omitted') return -1;
    return a.option.localeCompare(b.option);
  });

  // Prepare chart data
  const chartData = {
    labels: responseData.map(r => r.option),
    datasets: [
      {
        label: 'Response Frequency',
        data: responseData.map(r => r.frequency),
        backgroundColor: responseData.map(r =>
          r.isCorrect
            ? '#10b981' // Green for correct
            : r.option === 'Omitted'
              ? '#9ca3af' // Gray for omitted
              : '#ef4444' // Red for distractors
        ),
        borderColor: responseData.map(r =>
          r.isCorrect
            ? '#059669'
            : r.option === 'Omitted'
              ? '#6b7280'
              : '#dc2626'
        ),
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const data = responseData[context.dataIndex];
            return [
              `Frequency: ${data.frequency}`,
              `Percentage: ${data.percentage.toFixed(1)}%`,
              `Point-Biserial: ${data.pointBiserial.toFixed(3)}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Frequency',
          font: { size: 12 },
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Response Options',
          font: { size: 12 },
        },
      },
    },
  };



  const difficultyIndicator = getQualityIndicator(question.difficultyIndex, 'difficulty');
  const discriminationIndicator = getQualityIndicator(question.discriminationIndex, 'discrimination');
  const pointBiserialIndicator = getQualityIndicator(question.pointBiserialCorrelation, 'pointBiserial');

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Question Header */}
      <div className="bg-brand-navy text-white px-6 py-4">
        <h3 className="text-lg font-semibold">
          Question {questionNumber}: {question.questionText}
        </h3>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-sm bg-blue-700 px-2 py-1 rounded">
            {question.questionType === 'TRUE_FALSE' ? 'True/False' : 'Multiple Choice'}
          </span>
          <span className="text-sm">
            {question.correctResponses}/{question.totalResponses} correct
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Analysis Table */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-gray-900">Response Analysis</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                      Response
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Frequency
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Percent
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      Point Biserial
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responseData.map((response, index) => (
                    <tr key={response.option} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className={`border border-gray-300 px-3 py-2 font-medium ${response.isCorrect
                        ? 'text-green-700 bg-green-50'
                        : response.option === 'Omitted'
                          ? 'text-gray-600'
                          : 'text-gray-900'
                        }`}>
                        {response.option}
                        {response.isCorrect && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                            Correct
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                        {response.frequency}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                        {response.percentage.toFixed(1)}%
                      </td>
                      <td className={`border border-gray-300 px-3 py-2 text-center text-sm font-medium ${response.isCorrect
                        ? response.pointBiserial > 0.2 ? 'text-green-600' : 'text-orange-600'
                        : response.pointBiserial < -0.1 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {response.pointBiserial.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td className="border border-gray-300 px-3 py-2">Total</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {question.totalResponses}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">100.0%</td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bar Chart */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-gray-900">Response Distribution</h4>
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Statistics Row */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Difficulty Index</div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {(question.difficultyIndex * 100).toFixed(1)}%
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyIndicator.color}`}>
                {difficultyIndicator.label}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Discrimination Index</div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {question.discriminationIndex.toFixed(3)}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${discriminationIndicator.color}`}>
                {discriminationIndicator.label}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Point-Biserial Correlation</div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {question.pointBiserialCorrelation.toFixed(3)}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${pointBiserialIndicator.color}`}>
                {pointBiserialIndicator.label}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Statistical Significance</div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-blue-900">
                {question.statisticalSignificance.isSignificant ? 'Significant' : 'Not Significant'}
              </span>
              <span className="text-sm text-blue-700">
                p = {question.statisticalSignificance.pValue.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Test Statistic</div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-purple-900">
                χ² = {question.statisticalSignificance.testStatistic.toFixed(3)}
              </span>
              <span className="text-sm text-purple-700">
                Critical = {question.statisticalSignificance.criticalValue.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SummaryAnalysisReport({ analysisResult }: AnalysisDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-brand-navy text-white px-6 py-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Detailed Item Analysis Report</h2>
        <p className="text-blue-100 mb-4">
          Comprehensive analysis of {analysisResult.examTitle} with {analysisResult.questionResults.length} questions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{analysisResult.metadata.sampleSize}</div>
            <div className="text-sm text-blue-200">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(analysisResult.summary.averageDifficulty * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-blue-200">Avg Difficulty</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {analysisResult.summary.averageDiscrimination.toFixed(3)}
            </div>
            <div className="text-sm text-blue-200">Avg Discrimination</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {analysisResult.summary.averagePointBiserial.toFixed(3)}
            </div>
            <div className="text-sm text-blue-200">Avg Point-Biserial</div>
          </div>
        </div>
      </div>

      {/* Question Analysis Cards */}
      <div className="space-y-6">
        {analysisResult.questionResults.map((question, index) => (
          <QuestionAnalysisCard
            key={question.questionId}
            question={question}
            questionNumber={index + 1}
          />
        ))}
      </div>

      {/* Report Footer */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-6">Statistical Indices Interpretation Guide</h3>

        {/* Quick Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Difficulty Index</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• &gt;80%: Very Easy</li>
              <li>• 60-80%: Easy</li>
              <li>• 40-60%: Moderate</li>
              <li>• 20-40%: Hard</li>
              <li>• &lt;20%: Very Hard</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Discrimination Index</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• &gt;0.4: Excellent</li>
              <li>• 0.3-0.4: Good</li>
              <li>• 0.2-0.3: Fair</li>
              <li>• 0.1-0.2: Poor</li>
              <li>• &lt;0.1: Very Poor</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Point-Biserial Correlation</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• &gt;0.4: Excellent</li>
              <li>• 0.3-0.4: Good</li>
              <li>• 0.2-0.3: Acceptable</li>
              <li>• 0.1-0.2: Poor</li>
              <li>• &lt;0.1: Very Poor</li>
            </ul>
          </div>
        </div>

        {/* Detailed Explanations */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h4 className="text-base font-semibold text-gray-900 mb-2">📊 Difficulty Index</h4>
            <div className="bg-white p-3 rounded-lg border text-sm">
              <p className="text-gray-700 mb-2">
                <strong>Measures:</strong> Proportion of students who answered correctly.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-green-700">🔺 Higher (0.7-1.0):</span>
                  <span className="text-gray-600"> Easier question, more students correct</span>
                </div>
                <div>
                  <span className="font-medium text-red-700">🔻 Lower (0.0-0.3):</span>
                  <span className="text-gray-600"> Harder question, fewer students correct</span>
                </div>
              </div>
              <p className="text-xs text-blue-800 mt-2 bg-blue-50 p-2 rounded">
                <strong>Ideal:</strong> 0.4-0.8 (40-80% correct) balances accessibility and discrimination.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">⚡ Discrimination Index</h4>
            <div className="bg-white p-3 rounded-lg border text-sm">
              <p className="text-gray-700 mb-2">
                <strong>Measures:</strong> How well the question separates high and low performers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-green-700">🔺 Higher (0.3-1.0):</span>
                  <span className="text-gray-600"> Good separation, high-ability students answer correctly</span>
                </div>
                <div>
                  <span className="font-medium text-red-700">🔻 Lower (0.0-0.2):</span>
                  <span className="text-gray-600"> Poor separation, random performance</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">🎯 Point-Biserial Correlation</h4>
            <div className="bg-white p-3 rounded-lg border text-sm">
              <p className="text-gray-700 mb-2">
                <strong>Measures:</strong> Correlation between this question and total test score.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-green-700">🔺 Higher (0.3-1.0):</span>
                  <span className="text-gray-600"> Strong alignment with overall test</span>
                </div>
                <div>
                  <span className="font-medium text-red-700">🔻 Lower (0.0-0.2):</span>
                  <span className="text-gray-600"> Weak relationship with overall performance</span>
                </div>
              </div>
              <p className="text-xs text-blue-800 mt-2 bg-blue-50 p-2 rounded">
                <strong>Note:</strong> For distractors, negative correlations are good.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">📈 Statistical Significance</h4>
            <div className="bg-white p-3 rounded-lg border text-sm">
              <p className="text-gray-700 mb-2">
                <strong>Measures:</strong> Whether performance is better than random guessing.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-green-700">✅ Significant (p&lt;0.05):</span>
                  <span className="text-gray-600"> Better than chance, reliable results</span>
                </div>
                <div>
                  <span className="font-medium text-red-700">❌ Non-Significant (p&gt;0.05):</span>
                  <span className="text-gray-600"> Not different from guessing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 