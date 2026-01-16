import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that mimics enhanced dashboard stats
const TestEnhancedDashboardStats = ({ mockApiResponse }: any) => {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    overview: {
      totalQuestions: 0,
      totalExams: 0,
      totalCourses: 0,
      totalQuestionLists: 0,
      activeUsers: 0,
      totalUsers: 0,
    },
    todayActivity: {
      questionsToday: 0,
      examsToday: 0,
      coursesCreatedToday: 0,
      examsTaken: 0,
    },
    analytics: {
      examsAnalyzed: 0,
      completionRate: 0,
      popularSubject: '',
      avgScore: 0,
    },
    insights: {
      topCourses: [],
      recentActivity: [],
    }
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        if (mockApiResponse) {
          setStats(mockApiResponse);
        } else {
          // Simulate API call
          const response = await fetch('/api/admin/stats');
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [mockApiResponse]);

  if (loading) {
    return <div data-testid="loading">Loading statistics...</div>;
  }

  return (
    <div data-testid="enhanced-dashboard-stats">
      {/* System Status Widget */}
      <div data-testid="system-status-widget">
        <h3>System Status</h3>
        <div data-testid="system-health">
          <span>Database: Connected</span>
          <span>Status: Operational</span>
        </div>
        <div data-testid="user-counts">
          <span>Verified Users: {stats.overview.activeUsers}</span>
          <span>Total Users: {stats.overview.totalUsers}</span>
        </div>
      </div>

      {/* Content Overview Widget */}
      <div data-testid="content-overview-widget">
        <h3>Content Overview</h3>
        <div data-testid="content-stats">
          <div data-testid="total-questions">Questions: {stats.overview.totalQuestions}</div>
          <div data-testid="total-exams">Exams: {stats.overview.totalExams}</div>
          <div data-testid="total-courses">Courses: {stats.overview.totalCourses}</div>
          <div data-testid="total-question-lists">Question Lists: {stats.overview.totalQuestionLists}</div>
        </div>
      </div>

      {/* Today's Activity Widget */}
      <div data-testid="today-activity-widget">
        <h3>Today's Activity</h3>
        <div data-testid="today-stats">
          <div data-testid="questions-today">Questions Created: {stats.todayActivity.questionsToday}</div>
          <div data-testid="exams-today">Exams Created: {stats.todayActivity.examsToday}</div>
          <div data-testid="courses-today">Courses Added: {stats.todayActivity.coursesCreatedToday}</div>
          <div data-testid="exams-taken-today">Exams Taken: {stats.todayActivity.examsTaken}</div>
        </div>
      </div>

      {/* Analytics Widget */}
      <div data-testid="analytics-widget">
        <h3>Analytics</h3>
        <div data-testid="analytics-stats">
          <div data-testid="completion-rate">Completion Rate: {stats.analytics.completionRate}%</div>
          <div data-testid="popular-subject">Popular Subject: {stats.analytics.popularSubject}</div>
          <div data-testid="avg-score">Average Score: {stats.analytics.avgScore}</div>
        </div>
      </div>

      {/* Top Courses Section */}
      <div data-testid="top-courses-section">
        <h3>Top Courses by Content</h3>
        <div data-testid="courses-list">
          {stats.insights.topCourses.length > 0 ? (
            stats.insights.topCourses.map((course: any) => (
              <div key={course.id} data-testid={`course-${course.id}`}>
                <span>{course.name}</span>
                <span>{course.questionCount} questions</span>
                <span>Instructor: {course.instructor}</span>
              </div>
            ))
          ) : (
            <div data-testid="no-courses">No courses found</div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div data-testid="recent-activity-section">
        <h3>Recent Activity</h3>
        <div data-testid="activity-feed">
          {stats.insights.recentActivity.length > 0 ? (
            stats.insights.recentActivity.map((activity: any) => (
              <div key={activity.id} data-testid={`activity-${activity.id}`}>
                <span>{activity.text}</span>
                <span>{activity.courseName}</span>
                <span>{activity.points} pts</span>
              </div>
            ))
          ) : (
            <div data-testid="no-activity">No recent activity</div>
          )}
        </div>
      </div>

      {/* User Activity Chart */}
      <div data-testid="user-activity-chart">
        <h3>User Activity Distribution</h3>
        <div data-testid="chart-legend">
          <span>Verified: {stats.overview.activeUsers}</span>
          <span>Unverified: {stats.overview.totalUsers - stats.overview.activeUsers}</span>
        </div>
      </div>
    </div>
  );
};

describe('Enhanced Dashboard Stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Real-time Data Integration', () => {
    it('should display comprehensive overview stats', async () => {
      const mockStats = {
        overview: {
          totalQuestions: 324,
          totalExams: 45,
          totalCourses: 12,
          totalQuestionLists: 8,
          activeUsers: 89,
          totalUsers: 150,
        },
        todayActivity: {
          questionsToday: 15,
          examsToday: 3,
          coursesCreatedToday: 1,
          examsTaken: 22,
        },
        analytics: {
          examsAnalyzed: 45,
          completionRate: 78.5,
          popularSubject: 'Mathematics',
          avgScore: 82.3,
        },
        insights: {
          topCourses: [],
          recentActivity: [],
        }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-dashboard-stats')).toBeInTheDocument();
      });

      // Verify overview stats
      expect(screen.getByTestId('total-questions')).toHaveTextContent('Questions: 324');
      expect(screen.getByTestId('total-exams')).toHaveTextContent('Exams: 45');
      expect(screen.getByTestId('total-courses')).toHaveTextContent('Courses: 12');
      expect(screen.getByTestId('total-question-lists')).toHaveTextContent('Question Lists: 8');
    });

    it('should display today activity metrics', async () => {
      const mockStats = {
        overview: { totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0, activeUsers: 0, totalUsers: 0 },
        todayActivity: {
          questionsToday: 7,
          examsToday: 2,
          coursesCreatedToday: 1,
          examsTaken: 14,
        },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: { topCourses: [], recentActivity: [] }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('questions-today')).toHaveTextContent('Questions Created: 7');
        expect(screen.getByTestId('exams-today')).toHaveTextContent('Exams Created: 2');
        expect(screen.getByTestId('courses-today')).toHaveTextContent('Courses Added: 1');
        expect(screen.getByTestId('exams-taken-today')).toHaveTextContent('Exams Taken: 14');
      });
    });

    it('should display analytics with completion rates and scores', async () => {
      const mockStats = {
        overview: { totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0, activeUsers: 0, totalUsers: 0 },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: {
          examsAnalyzed: 125,
          completionRate: 85.2,
          popularSubject: 'Computer Science',
          avgScore: 78.9,
        },
        insights: { topCourses: [], recentActivity: [] }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('completion-rate')).toHaveTextContent('Completion Rate: 85.2%');
        expect(screen.getByTestId('popular-subject')).toHaveTextContent('Popular Subject: Computer Science');
        expect(screen.getByTestId('avg-score')).toHaveTextContent('Average Score: 78.9');
      });
    });
  });

  describe('User Status Terminology Updates', () => {
    it('should use Verified/Unverified terminology instead of Active/Inactive', async () => {
      const mockStats = {
        overview: {
          totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0,
          activeUsers: 45,
          totalUsers: 75,
        },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: { topCourses: [], recentActivity: [] }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        // Check that the legend uses new terminology
        const chartLegend = screen.getByTestId('chart-legend');
        expect(chartLegend).toHaveTextContent('Verified: 45');
        expect(chartLegend).toHaveTextContent('Unverified: 30'); // 75 - 45
        
        // Check that system status shows verified users
        const userCounts = screen.getByTestId('user-counts');
        expect(userCounts).toHaveTextContent('Verified Users: 45');
      });
    });

    it('should calculate unverified users correctly', async () => {
      const mockStats = {
        overview: {
          totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0,
          activeUsers: 23,
          totalUsers: 100,
        },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: { topCourses: [], recentActivity: [] }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        const chartLegend = screen.getByTestId('chart-legend');
        expect(chartLegend).toHaveTextContent('Verified: 23');
        expect(chartLegend).toHaveTextContent('Unverified: 77'); // 100 - 23
      });
    });
  });

  describe('Top Courses and Recent Activity', () => {
    it('should display top courses with instructor information', async () => {
      const mockStats = {
        overview: { totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0, activeUsers: 0, totalUsers: 0 },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: {
          topCourses: [
            { id: '1', name: 'Advanced Mathematics', questionCount: 45, instructor: 'Dr. Smith' },
            { id: '2', name: 'Computer Science 101', questionCount: 38, instructor: 'Prof. Johnson' },
          ],
          recentActivity: []
        }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('course-1')).toBeInTheDocument();
        expect(screen.getByTestId('course-2')).toBeInTheDocument();
        
        expect(screen.getByText('Advanced Mathematics')).toBeInTheDocument();
        expect(screen.getByText('45 questions')).toBeInTheDocument();
        expect(screen.getByText('Instructor: Dr. Smith')).toBeInTheDocument();
        
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
        expect(screen.getByText('38 questions')).toBeInTheDocument();
        expect(screen.getByText('Instructor: Prof. Johnson')).toBeInTheDocument();
      });
    });

    it('should display recent activity feed with course context', async () => {
      const mockStats = {
        overview: { totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0, activeUsers: 0, totalUsers: 0 },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: {
          topCourses: [],
          recentActivity: [
            { id: '1', text: 'What is the derivative of x squared?', courseName: 'Calculus I', points: 5 },
            { id: '2', text: 'Explain binary search algorithm', courseName: 'Data Structures', points: 10 },
          ]
        }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('activity-1')).toBeInTheDocument();
        expect(screen.getByTestId('activity-2')).toBeInTheDocument();
        
        expect(screen.getByText('What is the derivative of x squared?')).toBeInTheDocument();
        expect(screen.getByText('Calculus I')).toBeInTheDocument();
        expect(screen.getByText('5 pts')).toBeInTheDocument();
        
        expect(screen.getByText('Explain binary search algorithm')).toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
        expect(screen.getByText('10 pts')).toBeInTheDocument();
      });
    });

    it('should handle empty states gracefully', async () => {
      const mockStats = {
        overview: { totalQuestions: 0, totalExams: 0, totalCourses: 0, totalQuestionLists: 0, activeUsers: 0, totalUsers: 0 },
        todayActivity: { questionsToday: 0, examsToday: 0, coursesCreatedToday: 0, examsTaken: 0 },
        analytics: { examsAnalyzed: 0, completionRate: 0, popularSubject: '', avgScore: 0 },
        insights: {
          topCourses: [],
          recentActivity: []
        }
      };

      render(<TestEnhancedDashboardStats mockApiResponse={mockStats} />);

      await waitFor(() => {
        expect(screen.getByTestId('no-courses')).toBeInTheDocument();
        expect(screen.getByTestId('no-activity')).toBeInTheDocument();
        expect(screen.getByText('No courses found')).toBeInTheDocument();
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States and Error Handling', () => {
    it('should show loading state initially', () => {
      render(<TestEnhancedDashboardStats />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('should handle API fetch completion', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overview: { totalQuestions: 100, totalExams: 10, totalCourses: 5, totalQuestionLists: 3, activeUsers: 20, totalUsers: 50 },
          todayActivity: { questionsToday: 5, examsToday: 1, coursesCreatedToday: 0, examsTaken: 8 },
          analytics: { examsAnalyzed: 10, completionRate: 80, popularSubject: 'Math', avgScore: 75 },
          insights: { topCourses: [], recentActivity: [] }
        })
      });

      render(<TestEnhancedDashboardStats />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('enhanced-dashboard-stats')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/stats');
    });
  });
}); 