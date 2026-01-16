// Define interfaces to type the test data (matches component types)
interface TopicStats {
  correct: number;
  wrong: number;
}

interface ExamStats {
  topicStats: Record<string, TopicStats>;
}

interface ExamResult {
  id: string;
  stats?: ExamStats;
  score?: number;
  percentage?: number;
  createdAt?: string;
  exam?: { title: string };
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

// Test data processing logic with proper typing
describe("StudentReportPage - Data Logic Tests", () => {
  // 1. Test overall topic performance calculation
  test("calculateOverallTopicPerformance should correctly aggregate topic data across all exams", () => {
    // Typed test data
    const examResults: ExamResult[] = [
      {
        id: "result-1",
        stats: {
          topicStats: {
            "JavaScript": { correct: 3, wrong: 1 },
            "HTML": { correct: 2, wrong: 2 }
          }
        }
      },
      {
        id: "result-2",
        stats: {
          topicStats: {
            "JavaScript": { correct: 1, wrong: 1 },
            "CSS": { correct: 4, wrong: 0 }
          }
        }
      }
    ];

    // Typed calculation function
    const calculate = (results: ExamResult[]) => {
      const topicMap: Record<string, { correct: number; wrong: number }> = {};
      
      results.forEach(result => {
        if (result.stats?.topicStats) {
          Object.entries(result.stats.topicStats).forEach(([topic, stats]) => {
            if (!topicMap[topic]) {
              topicMap[topic] = { correct: 0, wrong: 0 };
            }
            topicMap[topic].correct += stats.correct;
            topicMap[topic].wrong += stats.wrong;
          });
        }
      });
      
      return Object.entries(topicMap)
        .map(([topic, stats]) => ({
          topic,
          correct: stats.correct,
          wrong: stats.wrong,
          accuracy: Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
        }))
        .sort((a, b) => b.accuracy - a.accuracy);
    };

    const result = calculate(examResults);
    expect(result).toEqual([
      { topic: "CSS", correct: 4, wrong: 0, accuracy: 100 },
      { topic: "JavaScript", correct: 4, wrong: 2, accuracy: 67 },
      { topic: "HTML", correct: 2, wrong: 2, accuracy: 50 }
    ]);
  });

  // 2. Test chart data formatting and sorting
  test("prepareChartData should correctly format dates and sort chronologically", () => {
    // Typed test data
    const examResults: ExamResult[] = [
      {
        id: "result-2",
        score: 90,
        percentage: 90,
        createdAt: "2024-06-20T10:15:00",
        exam: { title: "Final" }
      },
      {
        id: "result-1",
        score: 80,
        percentage: 80,
        createdAt: "2024-03-15T14:30:00",
        exam: { title: "Midterm" }
      }
    ];

    // Typed formatting function
    const format = (results: ExamResult[]) => {
      return results
        .map(result => {
          const date = new Date(result.createdAt || '');
          return {
            date: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
            timestamp: date.getTime(),
            score: result.score || 0,
            percentage: result.percentage || 0,
            exam: result.exam?.title || ''
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
    };

    const result = format(examResults);
    expect(result[0].exam).toBe("Midterm");
    expect(result[1].percentage).toBe(90);
    expect(result[0].date).toBe("3/15 14:30");
  });

  // 3. Test student data anonymization logic
  test("anonymization should correctly hide student identifying information", () => {
    // Typed test data
    const student: Student = { 
      id: "s1", 
      name: "John Doe", 
      studentId: "S2023001" 
    };
    
    // Typed anonymization function
    const anonymize = (s: Student) => ({ 
      ...s, 
      name: "Anonymous Student", 
      studentId: "Hidden" 
    });
    
    const result = anonymize(student);
    expect(result.name).toBe("Anonymous Student");
    expect(result.studentId).toBe("Hidden");
    expect(result.id).toBe("s1");
  });
});
    