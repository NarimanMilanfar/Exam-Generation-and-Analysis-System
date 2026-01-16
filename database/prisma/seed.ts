import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash passwords
  const professorPassword = await bcrypt.hash("professor123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const adminPassword = await bcrypt.hash("admin123", 12);

  // Create users
  const professor = await prisma.user.upsert({
    where: { email: "professor@uexam.com" },
    update: {},
    create: {
      email: "professor@uexam.com",
      name: "Professor Smith",
      password: professorPassword,
      role: "TEACHER",
      emailVerified: new Date(),
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@uexam.com" },
    update: {},
    create: {
      email: "teacher@uexam.com",
      name: "Teacher Johnson",
      password: teacherPassword,
      role: "TEACHER",
      emailVerified: new Date(),
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@uexam.com" },
    update: {},
    create: {
      email: "admin@uexam.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // Create terms for multiple years
  const terms: any[] = [];
  const termNames = [
    "Winter Term 1",
    "Winter Term 2",
    "Summer Term 1",
    "Summer Term 2",
  ];
  const years = [2024, 2025, 2026];

  for (const year of years) {
    for (const termName of termNames) {
      const term = await prisma.term.upsert({
        where: {
          term_year: {
            term: termName,
            year: year,
          },
        },
        update: {},
        create: {
          term: termName,
          year: year,
        },
      });
      terms.push(term);
    }
  }

  // Get specific terms for exam creation (default to 2025)
  const termW1_2025 = terms.find(
    (t) => t.term === "Winter Term 1" && t.year === 2025
  );
  const termS1_2025 = terms.find(
    (t) => t.term === "Summer Term 1" && t.year === 2025
  );

  if (!termW1_2025 || !termS1_2025) {
    throw new Error("Required terms not found for exam creation");
  }

  // Check if demo courses already exist - if so, skip creation
  const existingCourse1 = await prisma.course.findUnique({
    where: { id: "cm4abcd1234567890abcdef12" },
  });

  if (existingCourse1) {
    console.log("✅ Demo data already exists, skipping course creation...");
    console.log("✅ Database seeded successfully!");
    console.log("📝 Demo accounts and courses preserved");
    console.log("\nDemo accounts available:");
    console.log("- professor@uexam.com / professor123 (TEACHER)");
    console.log("- teacher@uexam.com / teacher123 (TEACHER)");
    console.log("- admin@uexam.com / admin123 (ADMIN)");
    return;
  }

  console.log("🏗️  Creating demo courses and questions...");

  // Create courses with proper unique IDs
  const course1 = await prisma.course.create({
    data: {
      id: "cm4abcd1234567890abcdef12",
      name: "COSC 101",
      description: "Introduction to Programming",
      color: "#10b981",
      userId: professor.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      id: "cm4efgh1234567890abcdef34",
      name: "MATH 201",
      description: "Advanced Calculus",
      color: "#8b5cf6",
      userId: professor.id,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      id: "cm4ijkl1234567890abcdef56",
      name: "CPSC 221",
      description: "Algorithms and Data Structures",
      color: "#f59e0b",
      userId: teacher.id,
    },
  });

  const course4 = await prisma.course.create({
    data: {
      id: "cm4mnop1234567890abcdef78",
      name: "CPSC 304",
      description: "Introduction to Database Management",
      color: "#ef4444",
      userId: teacher.id,
    },
  });

  // ==========================================================================
  // COURSE 1: COSC 101 - Introduction to Programming
  // ==========================================================================

  // Create multiple question banks for COSC 101
  const programmingBasicsBank = await prisma.questionBank.create({
    data: {
      name: "Programming Fundamentals",
      description: "Basic programming concepts and syntax",
      topic: "Fundamentals",
      courseId: course1.id,
      userId: professor.id,
    },
  });

  const pythonBasicsBank = await prisma.questionBank.create({
    data: {
      name: "Python Basics",
      description: "Python syntax and basic operations",
      topic: "Python",
      courseId: course1.id,
      userId: professor.id,
    },
  });

  const dataTypesBank = await prisma.questionBank.create({
    data: {
      name: "Data Types & Variables",
      description: "Variables, strings, numbers, and basic data types",
      topic: "Data Types",
      courseId: course1.id,
      userId: professor.id,
    },
  });

  const controlFlowBank = await prisma.questionBank.create({
    data: {
      name: "Control Flow",
      description: "Loops, conditionals, and program flow",
      topic: "Control Structures",
      courseId: course1.id,
      userId: professor.id,
    },
  });

  const functionsBank = await prisma.questionBank.create({
    data: {
      name: "Functions & Methods",
      description: "Function definition, parameters, and return values",
      topic: "Functions",
      courseId: course1.id,
      userId: professor.id,
    },
  });

  // COSC 101 Questions (35 questions total)
  const cs101Questions = [
    // Programming Fundamentals (7 questions)
    {
      text: "What is the output of print('Hello World') in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["Hello World", "undefined", "null", "Error"]),
      correctAnswer: "Hello World",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Basic Output",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "Which of the following is NOT a programming language?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["Python", "Java", "HTML", "C++"]),
      correctAnswer: "HTML",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Programming Languages",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "Programming is only about writing code.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "False",
      points: 1,
      negativePoints: 0,
      difficulty: "MEDIUM",
      topic: "Programming Concepts",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "What does 'debugging' mean in programming?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Writing new code",
        "Finding and fixing errors",
        "Deleting code",
        "Running code faster",
      ]),
      correctAnswer: "Finding and fixing errors",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Debugging",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "An algorithm is a step-by-step procedure for solving a problem.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Algorithms",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "What is the purpose of comments in code?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "To make code run faster",
        "To explain what the code does",
        "To create variables",
        "To import libraries",
      ]),
      correctAnswer: "To explain what the code does",
      points: 2,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Code Documentation",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },
    {
      text: "Which concept allows code to be reused multiple times?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Functions",
        "Comments",
        "Variables",
        "Print statements",
      ]),
      correctAnswer: "Functions",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Code Reusability",
      courseId: course1.id,
      questionBankId: programmingBasicsBank.id,
    },

    // Python Basics (8 questions)
    {
      text: "Which symbol is used for comments in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["//", "/*", "#", "--"]),
      correctAnswer: "#",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Python Syntax",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "Python is case-sensitive.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Python Features",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "What does the len() function do in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Returns the length of an object",
        "Creates a new list",
        "Converts to lowercase",
        "Prints to screen",
      ]),
      correctAnswer: "Returns the length of an object",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Built-in Functions",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "Which keyword is used to define a function in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["function", "def", "define", "func"]),
      correctAnswer: "def",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Function Definition",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "What is the correct way to import the math module?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "include math",
        "import math",
        "using math",
        "require math",
      ]),
      correctAnswer: "import math",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Modules",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "Python uses indentation to define code blocks.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "MEDIUM",
      topic: "Python Syntax",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "What is the output of: print(type(42))?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "<class 'int'>",
        "<class 'float'>",
        "<class 'str'>",
        "42",
      ]),
      correctAnswer: "<class 'int'>",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Data Types",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },
    {
      text: "Which operator is used for string concatenation in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["+", "&", ".", "*"]),
      correctAnswer: "+",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "String Operations",
      courseId: course1.id,
      questionBankId: pythonBasicsBank.id,
    },

    // Data Types & Variables (8 questions)
    {
      text: "Which of the following is a valid variable name in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "2variable",
        "my_variable",
        "my-variable",
        "class",
      ]),
      correctAnswer: "my_variable",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Variable Naming",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "What is the data type of the value 3.14?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["int", "float", "string", "boolean"]),
      correctAnswer: "float",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Numeric Types",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "Strings in Python are immutable.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "HARD",
      topic: "String Properties",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "What does the bool() function return for an empty string?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["True", "False", "None", "Error"]),
      correctAnswer: "False",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Boolean Conversion",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "Which data structure is ordered and changeable in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["tuple", "set", "list", "frozenset"]),
      correctAnswer: "list",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Data Structures",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "What is the correct way to create a dictionary?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "dict = []",
        "dict = {}",
        "dict = ()",
        "dict = set()",
      ]),
      correctAnswer: "dict = {}",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Dictionary Creation",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "Lists in Python can contain different data types.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "List Properties",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },
    {
      text: "What is the result of: str(123) + str(456)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["579", "123456", "Error", "None"]),
      correctAnswer: "123456",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Type Conversion",
      courseId: course1.id,
      questionBankId: dataTypesBank.id,
    },

    // Control Flow (7 questions)
    {
      text: "Which keyword is used for conditional statements in Python?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["if", "when", "check", "condition"]),
      correctAnswer: "if",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Conditionals",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "What loop would you use when you know the exact number of iterations?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "while loop",
        "for loop",
        "do-while loop",
        "repeat loop",
      ]),
      correctAnswer: "for loop",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Loop Types",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "The 'break' statement exits the current loop.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Loop Control",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "What does the 'continue' statement do in a loop?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Exits the loop",
        "Skips the current iteration",
        "Starts the loop over",
        "Pauses the loop",
      ]),
      correctAnswer: "Skips the current iteration",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Loop Control",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "What is the output of: range(3)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["[0, 1, 2]", "[1, 2, 3]", "range(0, 3)", "3"]),
      correctAnswer: "range(0, 3)",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Range Function",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "An 'elif' statement can only be used after an 'if' statement.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Conditional Logic",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },
    {
      text: "What happens if the condition in a while loop is always True?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "The loop runs once",
        "The loop never runs",
        "Infinite loop",
        "Syntax error",
      ]),
      correctAnswer: "Infinite loop",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "While Loops",
      courseId: course1.id,
      questionBankId: controlFlowBank.id,
    },

    // Functions & Methods (5 questions)
    {
      text: "What is a parameter in a function?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "The function name",
        "A variable used in function definition",
        "The return value",
        "A function call",
      ]),
      correctAnswer: "A variable used in function definition",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Function Parameters",
      courseId: course1.id,
      questionBankId: functionsBank.id,
    },
    {
      text: "Functions must always return a value.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "False",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Function Returns",
      courseId: course1.id,
      questionBankId: functionsBank.id,
    },
    {
      text: "What keyword is used to return a value from a function?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["return", "give", "output", "result"]),
      correctAnswer: "return",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Return Statement",
      courseId: course1.id,
      questionBankId: functionsBank.id,
    },
    {
      text: "What is the scope of a variable defined inside a function?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Global scope",
        "Local scope",
        "Module scope",
        "Class scope",
      ]),
      correctAnswer: "Local scope",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Variable Scope",
      courseId: course1.id,
      questionBankId: functionsBank.id,
    },
    {
      text: "Can a function call another function?",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Function Calls",
      courseId: course1.id,
      questionBankId: functionsBank.id,
    },
  ];

  // ==========================================================================
  // COURSE 2: MATH 201 - Advanced Calculus
  // ==========================================================================

  // Create multiple question banks for MATH 201
  const derivativesBank = await prisma.questionBank.create({
    data: {
      name: "Derivatives",
      description: "Derivative rules and applications",
      topic: "Differentiation",
      courseId: course2.id,
      userId: professor.id,
    },
  });

  const integralsBank = await prisma.questionBank.create({
    data: {
      name: "Integrals",
      description: "Integration techniques and applications",
      topic: "Integration",
      courseId: course2.id,
      userId: professor.id,
    },
  });

  const limitsBank = await prisma.questionBank.create({
    data: {
      name: "Limits",
      description: "Limits and continuity",
      topic: "Limits",
      courseId: course2.id,
      userId: professor.id,
    },
  });

  const seriesBank = await prisma.questionBank.create({
    data: {
      name: "Series & Sequences",
      description: "Infinite series and convergence tests",
      topic: "Series",
      courseId: course2.id,
      userId: professor.id,
    },
  });

  // MATH 201 Questions (32 questions total)
  const math201Questions = [
    // Derivatives (10 questions)
    {
      text: "What is the derivative of x²?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["x", "2x", "x²", "2"]),
      correctAnswer: "2x",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Basic Derivatives",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "The derivative of a constant is always zero.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Derivative Rules",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "Which rule is used to find the derivative of composite functions?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Product Rule",
        "Quotient Rule",
        "Chain Rule",
        "Power Rule",
      ]),
      correctAnswer: "Chain Rule",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Chain Rule",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "What is the derivative of sin(x)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"]),
      correctAnswer: "cos(x)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Trigonometric Derivatives",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "What is the derivative of e^x?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["e^x", "xe^(x-1)", "ln(x)", "1/x"]),
      correctAnswer: "e^x",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Exponential Derivatives",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "The product rule states: (fg)' = f'g + fg'",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Product Rule",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "What is the derivative of ln(x)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["1/x", "x", "e^x", "ln(x)"]),
      correctAnswer: "1/x",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Logarithmic Derivatives",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "The second derivative test can determine concavity.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Second Derivative",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "What is the derivative of tan(x)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "sec²(x)",
        "csc²(x)",
        "sec(x)tan(x)",
        "cos²(x)",
      ]),
      correctAnswer: "sec²(x)",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Trigonometric Derivatives",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },
    {
      text: "The derivative represents the instantaneous rate of change.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Derivative Interpretation",
      courseId: course2.id,
      questionBankId: derivativesBank.id,
    },

    // Integrals (8 questions)
    {
      text: "What is the integral of 2x dx?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["x² + C", "2x² + C", "x²", "2x"]),
      correctAnswer: "x² + C",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Basic Integration",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "The constant of integration is necessary for indefinite integrals.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Integration Constants",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "What is the integral of cos(x) dx?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "sin(x) + C",
        "-sin(x) + C",
        "cos(x) + C",
        "-cos(x) + C",
      ]),
      correctAnswer: "sin(x) + C",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Trigonometric Integration",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "Integration by parts is based on the product rule.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Integration by Parts",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "What is the integral of 1/x dx?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["ln|x| + C", "x + C", "1/x² + C", "e^x + C"]),
      correctAnswer: "ln|x| + C",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Logarithmic Integration",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "The Fundamental Theorem of Calculus connects derivatives and integrals.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Fundamental Theorem",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "What technique is used for integrals of the form ∫f(g(x))g'(x) dx?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Integration by parts",
        "U-substitution",
        "Partial fractions",
        "Trigonometric substitution",
      ]),
      correctAnswer: "U-substitution",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Substitution Method",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },
    {
      text: "Definite integrals represent the area under a curve.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Definite Integrals",
      courseId: course2.id,
      questionBankId: integralsBank.id,
    },

    // Limits (7 questions)
    {
      text: "What is lim(x→0) sin(x)/x?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["0", "1", "∞", "undefined"]),
      correctAnswer: "1",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Special Limits",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "A function is continuous at a point if the limit exists and equals the function value.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Continuity",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "What is lim(x→∞) 1/x?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["0", "1", "∞", "undefined"]),
      correctAnswer: "0",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Limits at Infinity",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "L'Hôpital's rule can be used for indeterminate forms.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "L'Hôpital's Rule",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "What type of discontinuity occurs when lim(x→a) f(x) ≠ f(a)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Removable discontinuity",
        "Jump discontinuity",
        "Infinite discontinuity",
        "All of the above",
      ]),
      correctAnswer: "Removable discontinuity",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Discontinuity Types",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "The squeeze theorem is useful for evaluating difficult limits.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Squeeze Theorem",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },
    {
      text: "What is lim(x→2) (x² - 4)/(x - 2)?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["0", "2", "4", "undefined"]),
      correctAnswer: "4",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Limit Evaluation",
      courseId: course2.id,
      questionBankId: limitsBank.id,
    },

    // Series & Sequences (7 questions)
    {
      text: "A geometric series with |r| < 1 converges.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Geometric Series",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "What test is used to determine convergence of alternating series?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Ratio test",
        "Root test",
        "Alternating series test",
        "Integral test",
      ]),
      correctAnswer: "Alternating series test",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Convergence Tests",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "The harmonic series ∑(1/n) converges.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "False",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Harmonic Series",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "What is the sum of the geometric series 1 + 1/2 + 1/4 + 1/8 + ...?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["1", "2", "∞", "1/2"]),
      correctAnswer: "2",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Series Sum",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "The ratio test compares consecutive terms of a series.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Ratio Test",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "What does a Taylor series represent?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "A finite polynomial",
        "An infinite series representation of a function",
        "A geometric series",
        "A constant function",
      ]),
      correctAnswer: "An infinite series representation of a function",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Taylor Series",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
    {
      text: "A sequence must converge for its corresponding series to converge.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "False",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Sequences vs Series",
      courseId: course2.id,
      questionBankId: seriesBank.id,
    },
  ];

  // ==========================================================================
  // COURSE 3: CPSC 221 - Algorithms and Data Structures
  // ==========================================================================

  // Create multiple question banks for CPSC 221
  const arraysListsBank = await prisma.questionBank.create({
    data: {
      name: "Arrays & Lists",
      description: "Array operations and list data structures",
      topic: "Linear Data Structures",
      courseId: course3.id,
      userId: teacher.id,
    },
  });

  const stacksQueuesBank = await prisma.questionBank.create({
    data: {
      name: "Stacks & Queues",
      description: "Stack and queue operations and applications",
      topic: "Stack Queue",
      courseId: course3.id,
      userId: teacher.id,
    },
  });

  const treesGraphsBank = await prisma.questionBank.create({
    data: {
      name: "Trees & Graphs",
      description: "Tree and graph algorithms and traversals",
      topic: "Trees Graphs",
      courseId: course3.id,
      userId: teacher.id,
    },
  });

  const sortingBank = await prisma.questionBank.create({
    data: {
      name: "Sorting Algorithms",
      description: "Comparison and analysis of sorting algorithms",
      topic: "Sorting",
      courseId: course3.id,
      userId: teacher.id,
    },
  });

  const complexityBank = await prisma.questionBank.create({
    data: {
      name: "Complexity Analysis",
      description: "Big O notation and algorithm analysis",
      topic: "Complexity",
      courseId: course3.id,
      userId: teacher.id,
    },
  });

  // CPSC 221 Questions (33 questions total)
  const dataStructuresQuestions = [
    // Arrays & Lists (7 questions)
    {
      text: "What is the time complexity of accessing an element in an array by index?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(1)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Array Access",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "Arrays have a fixed size in most programming languages.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Array Properties",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "What is the worst-case time complexity for inserting an element at the beginning of an array?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(n)",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Array Insertion",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "Linked lists allow dynamic memory allocation.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Linked Lists",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "What is the main advantage of a doubly linked list over a singly linked list?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Faster insertion",
        "Less memory usage",
        "Bidirectional traversal",
        "Better cache performance",
      ]),
      correctAnswer: "Bidirectional traversal",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Doubly Linked Lists",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "What is the space complexity of an array of n elements?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(n)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Space Complexity",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },
    {
      text: "Dynamic arrays (like ArrayList in Java) can resize automatically.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Dynamic Arrays",
      courseId: course3.id,
      questionBankId: arraysListsBank.id,
    },

    // Stacks & Queues (6 questions)
    {
      text: "What principle does a stack follow?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["FIFO", "LIFO", "FILO", "Random access"]),
      correctAnswer: "LIFO",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Stack Principle",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },
    {
      text: "A queue follows the First In, First Out (FIFO) principle.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Queue Principle",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },
    {
      text: "What operation adds an element to a stack?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["push", "pop", "enqueue", "dequeue"]),
      correctAnswer: "push",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Stack Operations",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },
    {
      text: "What is the time complexity of enqueue operation in a standard queue?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(1)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Queue Complexity",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },
    {
      text: "Stacks are useful for implementing function call management.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Stack Applications",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },
    {
      text: "What data structure is commonly used to implement a queue?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Array with two pointers",
        "Single pointer array",
        "Binary tree",
        "Hash table",
      ]),
      correctAnswer: "Array with two pointers",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Queue Implementation",
      courseId: course3.id,
      questionBankId: stacksQueuesBank.id,
    },

    // Trees & Graphs (8 questions)
    {
      text: "What is the maximum number of children a node can have in a binary tree?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["1", "2", "3", "unlimited"]),
      correctAnswer: "2",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Binary Trees",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "A binary search tree maintains sorted order.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Binary Search Trees",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "What is the worst-case time complexity for search in a binary search tree?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(n)",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "BST Complexity",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "Which traversal visits the root node first?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Inorder",
        "Preorder",
        "Postorder",
        "Level order",
      ]),
      correctAnswer: "Preorder",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Tree Traversal",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "A graph can contain cycles.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Graph Properties",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "What algorithm is used for finding the shortest path in an unweighted graph?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["DFS", "BFS", "Dijkstra", "Floyd-Warshall"]),
      correctAnswer: "BFS",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Graph Algorithms",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "Depth-First Search uses a stack data structure.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "DFS Implementation",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },
    {
      text: "What is a complete binary tree?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "All levels are filled",
        "All levels filled except possibly the last, filled left to right",
        "All leaves at the same level",
        "Perfect binary tree",
      ]),
      correctAnswer:
        "All levels filled except possibly the last, filled left to right",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Tree Types",
      courseId: course3.id,
      questionBankId: treesGraphsBank.id,
    },

    // Sorting Algorithms (6 questions)
    {
      text: "What is the best-case time complexity of bubble sort?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(n)", "O(n log n)", "O(n²)"]),
      correctAnswer: "O(n)",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Bubble Sort",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },
    {
      text: "Quick sort has a worst-case time complexity of O(n²).",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Quick Sort",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },
    {
      text: "Which sorting algorithm is stable?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Quick sort",
        "Heap sort",
        "Merge sort",
        "Selection sort",
      ]),
      correctAnswer: "Merge sort",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Stable Sorting",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },
    {
      text: "Insertion sort performs well on small datasets.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Insertion Sort",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },
    {
      text: "What is the average time complexity of merge sort?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(n)", "O(n log n)", "O(n²)", "O(2^n)"]),
      correctAnswer: "O(n log n)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Merge Sort",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },
    {
      text: "Counting sort can sort any type of data.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "False",
      points: 3,
      negativePoints: -1,
      difficulty: "HARD",
      topic: "Counting Sort",
      courseId: course3.id,
      questionBankId: sortingBank.id,
    },

    // Complexity Analysis (6 questions)
    {
      text: "What does Big O notation describe?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify([
        "Best case performance",
        "Average case performance",
        "Worst case performance",
        "Exact performance",
      ]),
      correctAnswer: "Worst case performance",
      points: 2,
      negativePoints: -0.5,
      difficulty: "EASY",
      topic: "Big O Notation",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
    {
      text: "O(log n) is better than O(n) for large inputs.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Complexity Comparison",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
    {
      text: "What is the time complexity of binary search?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(1)", "O(log n)", "O(n)", "O(n²)"]),
      correctAnswer: "O(log n)",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Binary Search",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
    {
      text: "Space complexity measures the amount of memory an algorithm uses.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 1,
      negativePoints: 0,
      difficulty: "EASY",
      topic: "Space Complexity",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
    {
      text: "What complexity class do most comparison-based sorting algorithms belong to?",
      type: "MULTIPLE_CHOICE",
      options: JSON.stringify(["O(n)", "O(n log n)", "O(n²)", "O(2^n)"]),
      correctAnswer: "O(n log n)",
      points: 3,
      negativePoints: -1,
      difficulty: "MEDIUM",
      topic: "Sorting Complexity",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
    {
      text: "Polynomial time algorithms are considered efficient.",
      type: "TRUE_FALSE",
      options: null,
      correctAnswer: "True",
      points: 2,
      negativePoints: -0.5,
      difficulty: "MEDIUM",
      topic: "Algorithm Efficiency",
      courseId: course3.id,
      questionBankId: complexityBank.id,
    },
  ];

  // ==========================================================================
  // COURSE 4: CPSC 304 - Database Management
  // ==========================================================================

  // Create multiple question banks for CPSC 304
  const sqlBasicsBank = await prisma.questionBank.create({
    data: {
      name: "SQL Fundamentals",
      description: "Basic SQL queries and operations",
      topic: "SQL Basics",
      courseId: course4.id,
      userId: teacher.id,
    },
  });

  const dbDesignBank = await prisma.questionBank.create({
    data: {
      name: "Database Design",
      description: "ER modeling and normalization",
      topic: "Database Design",
      courseId: course4.id,
      userId: teacher.id,
    },
  });

  const transactionsBank = await prisma.questionBank.create({
    data: {
      name: "Transactions & Concurrency",
      description: "ACID properties and transaction management",
      topic: "Transactions",
      courseId: course4.id,
      userId: teacher.id,
    },
  });

  const indexingBank = await prisma.questionBank.create({
    data: {
      name: "Indexing & Performance",
      description: "Database indexing and query optimization",
      topic: "Performance",
      courseId: course4.id,
      userId: teacher.id,
    },
  });

// CPSC 304 Questions (31 questions total)
const databaseQuestions = [
  // SQL Fundamentals (10 questions)
  {
    text: "Which SQL command is used to retrieve data from a database?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify(["INSERT", "UPDATE", "SELECT", "DELETE"]),
    correctAnswer: "SELECT",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "SQL Commands",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "SQL stands for Structured Query Language.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "SQL Basics",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "Which clause is used to filter rows in a SELECT statement?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify(["ORDER BY", "GROUP BY", "WHERE", "HAVING"]),
    correctAnswer: "WHERE",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "SQL Filtering",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "The DISTINCT keyword removes duplicate rows from query results.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "SQL Keywords",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "Which operator is used for pattern matching in SQL?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify(["=", "LIKE", "IN", "BETWEEN"]),
    correctAnswer: "LIKE",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Pattern Matching",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "What does the GROUP BY clause do?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Sorts the results",
      "Groups rows with same values",
      "Filters rows",
      "Joins tables",
    ]),
    correctAnswer: "Groups rows with same values",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "SQL Grouping",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "HAVING clause is used with GROUP BY to filter groups.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "SQL Filtering",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "Which join returns all rows from both tables?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "INNER JOIN",
      "LEFT JOIN",
      "RIGHT JOIN",
      "FULL OUTER JOIN",
    ]),
    correctAnswer: "FULL OUTER JOIN",
    points: 3,
    negativePoints: -1,
    difficulty: "MEDIUM",
    topic: "SQL Joins",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "The COUNT() function includes NULL values in its count.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "False",
    points: 3,
    negativePoints: -1,
    difficulty: "HARD",
    topic: "Aggregate Functions",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },
  {
    text: "Which SQL statement is used to modify existing data?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify(["INSERT", "UPDATE", "ALTER", "CREATE"]),
    correctAnswer: "UPDATE",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "SQL Commands",
    courseId: course4.id,
    questionBankId: sqlBasicsBank.id,
  },

  // Database Design (8 questions)
  {
    text: "What does ER stand for in database design?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Entity Relationship",
      "Extended Relational",
      "Electronic Record",
      "Error Recovery",
    ]),
    correctAnswer: "Entity Relationship",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "ER Modeling",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "A primary key uniquely identifies each row in a table.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "Primary Keys",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "What is the purpose of normalization?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Improve performance",
      "Reduce data redundancy",
      "Increase storage space",
      "Simplify queries",
    ]),
    correctAnswer: "Reduce data redundancy",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Normalization",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "A foreign key can reference a primary key in another table.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "Foreign Keys",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "What is First Normal Form (1NF)?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "No partial dependencies",
      "No transitive dependencies",
      "Atomic values only",
      "No multi-valued dependencies",
    ]),
    correctAnswer: "Atomic values only",
    points: 3,
    negativePoints: -1,
    difficulty: "MEDIUM",
    topic: "Normal Forms",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "Denormalization can improve query performance.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 3,
    negativePoints: -1,
    difficulty: "HARD",
    topic: "Denormalization",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "What type of relationship exists when one entity relates to many entities?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "One-to-One",
      "One-to-Many",
      "Many-to-Many",
      "Many-to-One",
    ]),
    correctAnswer: "One-to-Many",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "Relationships",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },
  {
    text: "Weak entities cannot exist without a strong entity.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Entity Types",
    courseId: course4.id,
    questionBankId: dbDesignBank.id,
  },

  // Transactions & Concurrency (7 questions)
  {
    text: "What does ACID stand for in database transactions?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Atomic, Consistent, Isolated, Durable",
      "Accurate, Complete, Independent, Distributed",
      "Active, Concurrent, Indexed, Distributed",
      "Automated, Centralized, Integrated, Detailed",
    ]),
    correctAnswer: "Atomic, Consistent, Isolated, Durable",
    points: 3,
    negativePoints: -1,
    difficulty: "MEDIUM",
    topic: "ACID Properties",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "A transaction is a logical unit of work.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 1,
    negativePoints: 0,
    difficulty: "EASY",
    topic: "Transaction Basics",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "Which command is used to make transaction changes permanent?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify(["SAVE", "COMMIT", "APPLY", "FINALIZE"]),
    correctAnswer: "COMMIT",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "Transaction Commands",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "ROLLBACK undoes all changes made in the current transaction.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "Transaction Commands",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "What is a deadlock in database systems?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "A crashed transaction",
      "Two transactions waiting for each other",
      "A very slow query",
      "A corrupted database",
    ]),
    correctAnswer: "Two transactions waiting for each other",
    points: 3,
    negativePoints: -1,
    difficulty: "HARD",
    topic: "Concurrency Issues",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "Isolation levels control how transactions interact with each other.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Isolation Levels",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },
  {
    text: "Which isolation level allows dirty reads?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "READ UNCOMMITTED",
      "READ COMMITTED",
      "REPEATABLE READ",
      "SERIALIZABLE",
    ]),
    correctAnswer: "READ UNCOMMITTED",
    points: 3,
    negativePoints: -1,
    difficulty: "HARD",
    topic: "Isolation Levels",
    courseId: course4.id,
    questionBankId: transactionsBank.id,
  },

  // Indexing & Performance (6 questions)
  {
    text: "What is the primary purpose of database indexes?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Save storage space",
      "Improve query performance",
      "Ensure data integrity",
      "Backup data",
    ]),
    correctAnswer: "Improve query performance",
    points: 2,
    negativePoints: -0.5,
    difficulty: "EASY",
    topic: "Index Purpose",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
  {
    text: "Indexes speed up SELECT operations but slow down INSERT operations.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Index Trade-offs",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
  {
    text: "Which type of index is most commonly used?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Hash index",
      "B-tree index",
      "Bitmap index",
      "Spatial index",
    ]),
    correctAnswer: "B-tree index",
    points: 3,
    negativePoints: -1,
    difficulty: "MEDIUM",
    topic: "Index Types",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
  {
    text: "Clustered indexes determine the physical storage order of data.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 3,
    negativePoints: -1,
    difficulty: "HARD",
    topic: "Clustered Index",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
  {
    text: "What is query optimization?",
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      "Writing better SQL queries",
      "The process of finding the most efficient execution plan",
      "Adding more indexes",
      "Increasing memory allocation",
    ]),
    correctAnswer: "The process of finding the most efficient execution plan",
    points: 3,
    negativePoints: -1,
    difficulty: "MEDIUM",
    topic: "Query Optimization",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
  {
    text: "Database statistics help the optimizer make better decisions.",
    type: "TRUE_FALSE",
    options: null,
    correctAnswer: "True",
    points: 2,
    negativePoints: -0.5,
    difficulty: "MEDIUM",
    topic: "Database Statistics",
    courseId: course4.id,
    questionBankId: indexingBank.id,
  },
];


  // Insert all questions
  const allQuestions = [
    ...cs101Questions,
    ...math201Questions,
    ...dataStructuresQuestions,
    ...databaseQuestions,
  ];

  console.log(`💾 Inserting ${allQuestions.length} questions...`);
  const createdQuestions = await prisma.question.createMany({
    data: allQuestions,
  });

  // Get the created questions for exam creation
  const cs101QuestionsOnly = await prisma.question.findMany({
    where: { courseId: course1.id },
    orderBy: { createdAt: "asc" },
  });

  const math201QuestionsOnly = await prisma.question.findMany({
    where: { courseId: course2.id },
    orderBy: { createdAt: "asc" },
  });

  // Create sample exams
  const exam = await prisma.exam.create({
    data: {
      title: "Programming Fundamentals Quiz",
      description: "Test your programming knowledge",
      courseId: course1.id,
      termId: termW1_2025.id,
      userId: professor.id,
      isPublished: false,
      timeLimit: 45,
      numberOfVersions: 1,
      questionsPerExam: 8,
      shuffleQuestions: false,
      shuffleAnswers: false,
      negativeMarking: true,
      totalPoints: cs101QuestionsOnly
        .slice(0, 8)
        .reduce((sum, q) => sum + q.points, 0),
    },
  });

  // Create ExamQuestion records for the programming exam
  for (let i = 0; i < 8; i++) {
    const question = cs101QuestionsOnly[i];
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: question.id,
        questionBankId: question.questionBankId,
        order: i,
        points: question.points,
      },
    });
  }

  // Create another exam for Mathematics
  const mathExam = await prisma.exam.create({
    data: {
      title: "Calculus Midterm",
      description: "Comprehensive calculus assessment",
      courseId: course2.id,
      termId: termS1_2025.id,
      userId: professor.id,
      isPublished: false,
      timeLimit: 90,
      numberOfVersions: 2,
      questionsPerExam: 6,
      shuffleQuestions: true,
      shuffleAnswers: true,
      negativeMarking: true,
      totalPoints: math201QuestionsOnly
        .slice(0, 6)
        .reduce((sum, q) => sum + q.points, 0),
    },
  });

  // Create ExamQuestion records for the math exam
  for (let i = 0; i < 6; i++) {
    const question = math201QuestionsOnly[i];
    await prisma.examQuestion.create({
      data: {
        examId: mathExam.id,
        questionId: question.id,
        questionBankId: question.questionBankId,
        order: i,
        points: question.points,
      },
    });
  }

  console.log("✅ Database seeded successfully!");
  console.log(`📚 Created ${allQuestions.length} questions across 4 courses:`);
  console.log(
    `   • COSC 101: ${cs101Questions.length} questions (5 question banks)`
  );
  console.log(
    `   • MATH 201: ${math201Questions.length} questions (4 question banks)`
  );
  console.log(
    `   • CPSC 221: ${dataStructuresQuestions.length} questions (5 question banks)`
  );
  console.log(
    `   • CPSC 304: ${databaseQuestions.length} questions (4 question banks)`
  );
  console.log("📝 Created 2 sample exams");
  console.log("\nQuestion Bank Distribution:");
  console.log(
    "🐍 COSC 101: Programming Fundamentals (7), Python Basics (8), Data Types (8), Control Flow (7), Functions (5)"
  );
  console.log(
    "📊 MATH 201: Derivatives (10), Integrals (8), Limits (7), Series (7)"
  );
  console.log(
    "🔗 CPSC 221: Arrays/Lists (7), Stacks/Queues (6), Trees/Graphs (8), Sorting (6), Complexity (6)"
  );
  console.log(
    "🗄️  CPSC 304: SQL Basics (10), DB Design (8), Transactions (7), Performance (6)"
  );
  console.log("\nDemo accounts created:");
  console.log("- professor@uexam.com / professor123 (TEACHER)");
  console.log("- teacher@uexam.com / teacher123 (TEACHER)");
  console.log("- admin@uexam.com / admin123 (ADMIN)");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
