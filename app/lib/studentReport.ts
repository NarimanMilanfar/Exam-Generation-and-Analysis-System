// lib/generatePdf.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
    autoTable: (options: any) => jsPDF;
  }
}

interface Student {
  name: string;
  studentId: string | null;
}

interface Course {
  name: string;
  color: string;
}

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
}

interface TopicPerformance {
  topic: string;
  correct: number;
  wrong: number;
  accuracy: number;
}

export const generateStudentReportPDF = (
  student: Student,
  course: Course,
  examResults: ExamResult[],
  overallTopicPerformance: TopicPerformance[]
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as jsPDF & { lastAutoTable?: { finalY: number } };

  // Set document metadata
  doc.setProperties({
    title: `${student.name}'s Performance Report`,
    subject: `Course: ${course.name}`,
    creator: 'Exam Analytics System'
  });

  // Cover page
  doc.setFontSize(24);
  doc.setTextColor(40);
  doc.text(`${student.name}'s Performance Report`, 105, 40, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Course: ${course.name}`, 105, 55, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 65, { align: 'center' });
  doc.setDrawColor(200);
  doc.line(20, 75, 190, 75);

  // Student info page
  doc.setFontSize(14);
  doc.text('Student Information', 20, 85);
  autoTable(doc, {
    startY: 90,
    head: [['Name', 'Student ID', 'Course']],
    body: [[student.name, student.studentId || 'N/A', course.name]],
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(course.color),
      textColor: 255
    }
  });

  // Overall summary page (new page)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Overall Performance', 20, 20);
  autoTable(doc, {
    startY: 25,
    head: [['Metric', 'Value']],
    body: [
      ['Total Exams Taken', examResults.length],
      ['Average Score', `${Math.round(examResults.reduce((sum, exam) => sum + (exam.percentage || 0), 0) / examResults.length)}%`]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(course.color),
      textColor: 255
    }
  });

  // Topic performance page (new page)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Topic Performance Overview', 20, 20);
  autoTable(doc, {
    startY: 25,
    head: [['Topic', 'Accuracy', 'Correct/Wrong']],
    body: overallTopicPerformance.map(topic => [
      topic.topic,
      `${topic.accuracy}%`,
      `${topic.correct}/${topic.correct + topic.wrong}`
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(course.color),
      textColor: 255
    },
    columnStyles: {
      1: { cellWidth: 30 },
      2: { cellWidth: 40 }
    }
  });

  // Exam details - each exam on its own page
  examResults.forEach((result, index) => {
    doc.addPage(); // Always start new page for each exam
    
    doc.setFontSize(14);
    doc.text(`Exam: ${result.exam.title}`, 20, 20);
    
    // Basic exam info
    autoTable(doc, {
      startY: 25,
      head: [['Metric', 'Value']],
      body: [
        ['Date', new Date(result.createdAt).toLocaleDateString()],
        ['Score', `${result.score}/${result.totalPoints}`],
        ['Percentage', `${result.percentage}%`],
        ['Variant', result.variantCode || 'N/A']
      ],
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(course.color),
        textColor: 255
      }
    });

    if (result.stats) {
      const lastY = doc.lastAutoTable?.finalY || 25;
      doc.setFontSize(12);
      doc.text('Performance Statistics', 20, lastY + 15);
      
      autoTable(doc, {
        startY: lastY + 20,
        head: [['Statistic', 'Value']],
        body: [
          ['Correct Answers', `${result.stats.correctCount}/${result.stats.totalQuestions}`],
          ['Wrong Answers', `${result.stats.wrongCount}/${result.stats.totalQuestions}`],
          ['Accuracy', `${Math.round((result.stats.correctCount / result.stats.totalQuestions) * 100)}%`]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(course.color),
          textColor: 255
        }
      });

      if (result.stats.topicStats) {
        const previousY = doc.lastAutoTable?.finalY || 25;
        doc.setFontSize(12);
        doc.text('Performance by Topic', 20, previousY + 20);
        
        autoTable(doc, {
          startY: previousY + 25,
          head: [['Topic', 'Accuracy', 'Correct/Wrong']],
          body: Object.entries(result.stats.topicStats).map(([topic, stats]) => [
            topic,
            `${Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)}%`,
            `${stats.correct}/${stats.correct + stats.wrong}`
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: hexToRgb(course.color),
            textColor: 255
          },
          columnStyles: {
            1: { cellWidth: 30 },
            2: { cellWidth: 40 }
          }
        });
      }
    }
    
    if (result.exam.description) {
      const lastY = doc.lastAutoTable?.finalY || 25;
      doc.setFontSize(10);
      doc.text('Exam Description:', 20, lastY + 15);
      doc.setFontSize(9);
      const descriptionLines = doc.splitTextToSize(result.exam.description || '', 170);
      doc.text(descriptionLines, 20, lastY + 20);
    }
  });

  return doc;
};

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}