/**
 * AnalysisExamChartsView - Displays a suite of exam analysis charts and summary statistics based on bi-point analysis results.
 * 
 * This component provides a comprehensive suite of exam analysis charts and summary statistics,
 * including point-biserial correlation chart, difficulty vs discrimination scatter plot,
 * statistical significance chart, and question difficulty distribution.
 * 
 * Features:
 * - Point-biserial correlation chart showing correlation between question difficulty and student performance
 * - Difficulty vs discrimination scatter plot showing relationship between question difficulty and discrimination
 * - Statistical significance chart showing chi-square test statistic for each question
 * - Question difficulty distribution showing distribution of question difficulty levels
 * - Summary statistics for average difficulty, discrimination, point-biserial, and sample size
 * - Question quality summary showing counts of good, fair, and poor questions
 * - Student score list showing detailed performance metrics for each student
 * 
 * @param {AnalysisDisplayProps} props - Component props containing analysis data
 * @param {BiPointAnalysisResult} props.analysisResult - The computed analysis results for the exam
 * 
 * @returns {JSX.Element} A React component displaying comprehensive exam analysis charts and statistics
 */

import {useState} from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js';
import { Bar, Scatter, Line } from 'react-chartjs-2';
import StudentScoreList from './StudentScoreView';
import { PercentileRange } from '../../../../../components/analytics/PercentileFilter';
import { AnalysisDisplayProps } from '../../../../../types/analysis';


// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);



interface ExtendedAnalysisDisplayProps extends AnalysisDisplayProps {
  onPercentileFilterChange?: (filter: PercentileRange | null) => void;
}

/**
 * Displays a suite of exam analysis charts and summary statistics based on bi-point analysis results.
 *
 * @param analysisResult - The computed analysis results for the exam, including question metrics and summary data.
 * @param onPercentileFilterChange - Callback to notify parent of percentile filter changes.
 * @returns React component rendering multiple charts and quality indicators for exam item analysis.
 */
export default function BiPointAnalysisCharts({ analysisResult, onPercentileFilterChange }: ExtendedAnalysisDisplayProps) {
  const { questionResults } = analysisResult;
  const [currentFilter, setCurrentFilter] = useState<PercentileRange | null>(null);

  const handleFilterChange = (filter: PercentileRange | null) => {
    setCurrentFilter(filter);
    onPercentileFilterChange?.(filter);
  };

  // 1. Point-Biserial Correlation Chart (Bar Chart)
  const pointBiserialData = {
    labels: questionResults.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Point-Biserial Correlation',
        data: questionResults.map(q => q.pointBiserialCorrelation),
        backgroundColor: questionResults.map(q =>
          q.pointBiserialCorrelation >= 0.3 ? '#10b981' : // Good (green)
            q.pointBiserialCorrelation >= 0.2 ? '#f59e0b' : // Fair (amber)  
              '#ef4444' // Poor (red)
        ),
        borderColor: '#374151',
        borderWidth: 1,
      },
    ],
  };

  const pointBiserialOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Point-Biserial Correlation by Question',
        font: { size: 16, weight: 'bold' as const },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const questionIndex = context[0].dataIndex;
            const question = questionResults[questionIndex];
            return question.questionText.length > 50
              ? question.questionText.substring(0, 50) + '...'
              : question.questionText;
          },
          afterLabel: (context: any) => {
            const value = context.raw;
            if (value >= 0.3) return 'Quality: Good (≥0.3)';
            if (value >= 0.2) return 'Quality: Fair (0.2-0.3)';
            return 'Quality: Poor (<0.2)';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: 'Correlation Coefficient',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Questions',
        },
      },
    },
  };

  // 2. Difficulty vs Discrimination Scatter Plot
  const difficultyDiscriminationData = {
    datasets: [
      {
        label: 'Questions',
        data: questionResults.map(q => ({
          x: q.difficultyIndex,
          y: q.discriminationIndex,
          questionId: q.questionId,
        })),
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const difficultyDiscriminationOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Question Quality Matrix: Difficulty vs Discrimination',
        font: { size: 16, weight: 'bold' as const },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const questionIndex = context[0].dataIndex;
            const question = questionResults[questionIndex];
            return question.questionText.length > 50
              ? question.questionText.substring(0, 50) + '...'
              : question.questionText;
          },
          label: (context: any) => [
            `Difficulty: ${(context.raw.x * 100).toFixed(1)}%`,
            `Discrimination: ${context.raw.y.toFixed(3)}`,
          ],
          afterLabel: (context: any) => {
            const difficulty = context.raw.x;
            const discrimination = context.raw.y;

            // Quality assessment
            if (difficulty >= 0.2 && difficulty <= 0.8 && discrimination >= 0.3) {
              return 'Quality: Excellent';
            } else if (discrimination >= 0.2) {
              return 'Quality: Good';
            } else if (discrimination >= 0.1) {
              return 'Quality: Fair';
            } else {
              return 'Quality: Poor';
            }
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Difficulty Index (p-value)',
        },
        min: 0,
        max: 1,
      },
      y: {
        title: {
          display: true,
          text: 'Discrimination Index',
        },
        min: -1,
        max: 1,
      },
    },
  };

  // 3. Statistical Significance Chart (Bar only for test statistics)
  const significanceData = {
    labels: questionResults.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Chi-Square Test Statistic',
        data: questionResults.map(q => q.statisticalSignificance.testStatistic),
        backgroundColor: questionResults.map(q =>
          q.statisticalSignificance.isSignificant ? '#10b981' : '#ef4444'
        ),
        borderColor: '#374151',
        borderWidth: 1,
      },
    ],
  };

  // Separate line chart for critical values
  const criticalValueData = {
    labels: questionResults.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Critical Value',
        data: questionResults.map(q => q.statisticalSignificance.criticalValue),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 4,
        borderDash: [5, 5],
      },
    ],
  };

  const significanceOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Statistical Significance (Chi-Square Test)',
        font: { size: 16, weight: 'bold' as const },
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const question = questionResults[context.dataIndex];
            return [
              `p-value: ${question.statisticalSignificance.pValue.toFixed(4)}`,
              `Significant: ${question.statisticalSignificance.isSignificant ? 'Yes' : 'No'}`,
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
          text: 'Test Statistic / Critical Value',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Questions',
        },
      },
    },
  };

  // 4. Question Difficulty Distribution
  const difficultyDistributionData = {
    labels: ['Very Easy (>80%)', 'Easy (60-80%)', 'Medium (40-60%)', 'Hard (20-40%)', 'Very Hard (<20%)'],
    datasets: [
      {
        label: 'Number of Questions',
        data: [
          questionResults.filter(q => q.difficultyIndex > 0.8).length,
          questionResults.filter(q => q.difficultyIndex > 0.6 && q.difficultyIndex <= 0.8).length,
          questionResults.filter(q => q.difficultyIndex > 0.4 && q.difficultyIndex <= 0.6).length,
          questionResults.filter(q => q.difficultyIndex > 0.2 && q.difficultyIndex <= 0.4).length,
          questionResults.filter(q => q.difficultyIndex <= 0.2).length,
        ],
        backgroundColor: ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'],
        borderColor: '#374151',
        borderWidth: 1,
      },
    ],
  };

  const difficultyDistributionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Question Difficulty Distribution',
        font: { size: 16, weight: 'bold' as const },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Questions',
        },
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Avg Difficulty</h3>
          <p className="text-2xl font-bold text-blue-600">
            {(analysisResult.summary.averageDifficulty * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Avg Discrimination</h3>
          <p className="text-2xl font-bold text-green-600">
            {analysisResult.summary.averageDiscrimination.toFixed(3)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Avg Point-Biserial</h3>
          <p className="text-2xl font-bold text-purple-600">
            {analysisResult.summary.averagePointBiserial.toFixed(3)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Sample Size</h3>
          <p className="text-2xl font-bold text-gray-600">
            {analysisResult.metadata.sampleSize}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Point-Biserial Correlation */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <Bar data={pointBiserialData} options={pointBiserialOptions} />
        </div>

        {/* Difficulty vs Discrimination Scatter */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <Scatter data={difficultyDiscriminationData} options={difficultyDiscriminationOptions} />
        </div>

        {/* Statistical Significance */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <Bar data={significanceData} options={significanceOptions} />
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <Bar data={difficultyDistributionData} options={difficultyDistributionOptions} />
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Question Quality Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {questionResults.filter(q => q.pointBiserialCorrelation >= 0.3).length}
            </div>
            <div className="text-sm text-gray-500">Good Questions (r ≥ 0.3)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">
              {questionResults.filter(q => q.pointBiserialCorrelation >= 0.2 && q.pointBiserialCorrelation < 0.3).length}
            </div>
            <div className="text-sm text-gray-500">Fair Questions (0.2 &le; r &lt; 0.3)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {questionResults.filter(q => q.pointBiserialCorrelation < 0.2).length}
            </div>
            <div className="text-sm text-gray-500">Poor Questions (r &lt; 0.2)</div>
          </div>
        </div>
      </div>

      {/* Student Score List */}
      <StudentScoreList 
        analysisResult={analysisResult} 
        onFilterChange={handleFilterChange}
      />
    </div>
  );
} 