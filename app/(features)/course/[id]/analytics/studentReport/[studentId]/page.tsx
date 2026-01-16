"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Sidebar from "../../../../../../components/Sidebar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { generateStudentReportPDF } from "../../../../../../lib/studentReport";

interface ExamResult {
  id: string;
  examId: string;
  score: number;
  totalPoints: number;
  percentage: number | null;
  variantCode: string | null;
  createdAt: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
    totalPoints: number | null;
  };
  stats?: {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    topicStats: Record<string, { correct: number; wrong: number }>;
  };
  studentAnswers: Array<{
    id: string;
    questionId: string;
    isCorrect: boolean;
    question: {
      topic: string | null;
    };
  }>;
}

interface Student {
  id: string;
  name: string;
  studentId: string | null;
}

interface Course {
  id: string;
  name: string;
  color: string;
}

interface TopicPerformance {
  topic: string;
  correct: number;
  wrong: number;
  accuracy: number;
}

export default function StudentReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const termId = searchParams.get('termId');

  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});

  const [showPdfPreview, setShowPdfPreview] = useState(false); // 控制预览框显示
  const [isAnonymous, setIsAnonymous] = useState(false); // 是否匿名化

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);

  const generatePdf = async (anonymous: boolean) => {
    if (!student || !course || examResults.length === 0) {
      toast.error("No data available to export");
      return null;
    }

    try {
      setIsGeneratingPdf(true);
      
      // Prepare student data based on anonymous status
      const studentData = anonymous
        ? { ...student, name: "Anonymous Student", studentId: "Hidden" }
        : student;
      
      // Generate a PDF document
      const doc = generateStudentReportPDF(
        studentData,
        course,
        examResults,
        calculateOverallTopicPerformance()
      );
      
      // transfer to Blob
      const pdfBlob = doc.output('blob');
      setCurrentPdfBlob(pdfBlob);
      return pdfBlob;
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Calculate the overall topic performance of all the exams
  const calculateOverallTopicPerformance = (): TopicPerformance[] => {
    const topicMap: Record<string, { correct: number; wrong: number }> = {};

    examResults.forEach(result => {
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

    return Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      wrong: stats.wrong,
      accuracy: Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
    })).sort((a, b) => b.accuracy - a.accuracy);
  };

  // Handle preview logic
  const handlePreviewPDF = async () => {
    setShowPdfPreview(true);
    // Generate a PDF using the current anonymous status
    await generatePdf(isAnonymous);
  };

  // Handle the download logic
  const handleDownloadPDF = async () => {
    if (currentPdfBlob) {
      downloadPdf(currentPdfBlob);
      setShowPdfPreview(false);
      return;
    }
    
    const blob = await generatePdf(isAnonymous);
    if (blob) {
      downloadPdf(blob);
    }
  };

  // Auxiliary download function
  const downloadPdf = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isAnonymous ? 'Anonymous' : student?.name}_${course?.name}_Report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF exported successfully!");
  };

  // Anonymous status change processing
  const handleAnonymousChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const anonymous = e.target.checked;
    setIsAnonymous(anonymous);
    await generatePdf(anonymous);
  };

  // Prepare line chart data
  const prepareChartData = () => {
    return examResults.map(result => {
      const date = new Date(result.createdAt);
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        date: formattedDate,
        timestamp: date.getTime(),
        score: result.score,
        percentage: result.percentage || 0,
        exam: result.exam.title,
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  };

  const toggleExamDetails = (examId: string) => {
    setExpandedExams(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }));
  };

  useEffect(() => {
    if (!courseId || !studentId || !termId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch course data
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!courseRes.ok) throw new Error("Failed to fetch course");
        const courseData = await courseRes.json();
        setCourse(courseData);

        // Fetch student data
        const studentRes = await fetch(`/api/courses/${courseId}/student/${studentId}`);
        if (!studentRes.ok) throw new Error("Failed to fetch student");
        const studentData = await studentRes.json();
        setStudent(studentData);

        // Fetch exam results for this student in this course with termId
        const resultsRes = await fetch(
          `/api/courses/${courseId}/student/${studentId}/result?termId=${termId}`
        );
        if (!resultsRes.ok) throw new Error("Failed to fetch exam results");
        const resultsData = await resultsRes.json();
        setExamResults(resultsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load student report");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, studentId, termId]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
          <p className="mt-4 text-gray-600">Loading student report...</p>
        </div>
      </div>
    );
  }

  if (!session || !course || !student) {
    return null;
  }

  const overallTopicPerformance = calculateOverallTopicPerformance();
  const chartData = prepareChartData();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* Main content area */}
      <div className="main-content flex-1">
        {/* Top navigation bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Dashboard
                </button>
                <div className="text-gray-300">→</div>
                <button
                  onClick={() => router.push(`/course/${courseId}`)}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  {course.name}
                </button>
                <div className="text-gray-300">→</div>
                <button
                  onClick={() => router.push(`/course/${courseId}/analytics`)}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  Analytics
                </button>
                <div className="text-gray-300">→</div>
                <button
                  onClick={() => router.push(`/course/${courseId}/analytics/studentReport`)}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  Student Reports
                </button>
                <div className="text-gray-300">→</div>
                <span className="text-brand-navy font-semibold text-sm">
                  {student.name}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div>
                <span className="text-sm font-medium text-gray-700">
                  {student.studentId || "No ID"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Student report content */}
        <div className="p-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="space-y-8">
              {/* Student header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-gray-600">
                    {student.studentId ? `Student ID: ${student.studentId}` : "No student ID available"}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push(`/course/${courseId}/analytics/studentReport`)}
                    className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to all students
                  </button>
                  
                  <button
                    onClick={handlePreviewPDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Export PDF
                  </button>
                </div>
              </div>

              {/* 1. Line chart of academic performance trends */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Score']}
                        labelFormatter={(label, payload) => {
                          const examName = payload?.[0]?.payload?.exam || '';
                          return `${examName}\n${label}`;
                        }}
                        contentStyle={{ whiteSpace: 'pre-line' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="percentage" stroke="#3b82f6" name="Score %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. An overview of the performance of all examination topics */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Topic Performance Overview</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overallTopicPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="topic" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#10b981" name="Accuracy %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overallTopicPerformance.map(topic => (
                    <div key={topic.topic} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900">{topic.topic}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex-1 bg-red-100 rounded-full h-2.5"> 
                          <div 
                            className="bg-green-500 h-2.5 rounded-full" 
                            style={{ width: `${topic.accuracy}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {topic.accuracy}%
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {topic.correct} correct / {topic.wrong} wrong
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Detailed analysis of each examination */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Exam Results</h2>
                
                {examResults.length > 0 ? (
                  <div className="space-y-4">
                    {examResults.map((result) => (
                      <div key={result.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{result.exam.title}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(result.createdAt).toLocaleDateString()} • 
                              {result.variantCode ? ` Variant ${result.variantCode}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium">
                                {result.score} / {result.totalPoints} points
                              </p>
                              <p className="text-sm text-gray-500">
                                {result.percentage ? `${result.percentage.toFixed(1)}%` : 'N/A'}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleExamDetails(result.id)}
                              className="text-brand-navy hover:text-navy-800"
                            >
                              {expandedExams[result.id] ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Examination summary information */}
                        {result.stats && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm text-green-800">Correct Answers</p>
                              <p className="text-2xl font-bold text-green-600">
                                {result.stats.correctCount}/{result.stats.totalQuestions}
                              </p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                              <p className="text-sm text-red-800">Wrong Answers</p>
                              <p className="text-2xl font-bold text-red-600">
                                {result.stats.wrongCount}/{result.stats.totalQuestions}
                              </p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-blue-800">Accuracy</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {Math.round((result.stats.correctCount / result.stats.totalQuestions) * 100)}%
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* The detailed presentation of the theme after expansion */}
                        {expandedExams[result.id] && result.stats && (
                          <div className="mt-6">
                            <h4 className="font-medium text-gray-900 mb-4">Performance by Topic</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(result.stats.topicStats).map(([topic, stats]) => {
                                const accuracy = Math.round((stats.correct / (stats.correct + stats.wrong)) * 100);
                                return (
                                  <div key={topic} className="border border-gray-200 rounded-lg p-4">
                                    <h5 className="font-medium text-gray-900">{topic}</h5>
                                    <div className="flex items-center justify-between mt-2">
                                      <div className="flex-1 bg-red-100 rounded-full h-2.5">
                                        <div 
                                          className="bg-green-500 h-2.5 rounded-full" 
                                          style={{ width: `${accuracy}%` }}
                                        ></div>
                                      </div>
                                      <span className="ml-2 text-sm font-medium text-gray-700">
                                        {accuracy}%
                                      </span>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                      {stats.correct} correct / {stats.wrong} wrong
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {result.exam.description && (
                          <p className="text-sm text-gray-600 mt-4">{result.exam.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Exam Results Found
                    </h3>
                    <p className="text-gray-600">
                      This student has not completed any exams in this course yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF preview modal box */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal box header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">PDF Preview</h3>
              <div className="flex items-center space-x-4">
                {/* Anonymization option */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={handleAnonymousChange}
                    className="rounded text-blue-600"
                    disabled={isGeneratingPdf}
                  />
                  <span className="text-sm">Anonymization (hiding student information)</span>
                  {isGeneratingPdf && (
                    <span className="text-xs text-gray-500">Generating...</span>
                  )}
                </label>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview content area */}
            <div className="flex-1 overflow-auto p-4">
              {currentPdfBlob ? (
                <iframe
                  key={isAnonymous ? 'anonymous' : 'normal'}
                  src={URL.createObjectURL(currentPdfBlob)}
                  width="100%"
                  height="100%"
                  className="min-h-[600px]"
                  title="PDF Preview"
                />
              ) : isGeneratingPdf ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
                  <p>Generating preview...</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No PDF available</p>
                </div>
              )}
            </div>

            {/* Bottom operation button */}
            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowPdfPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
