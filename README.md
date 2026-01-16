# 🚀 UExam - Complete Developer Guide

**Team 8 Capstone Project** 🎓

A web application for teachers to create, manage, and analyze multiple-choice exams.

---

## 🚀 **Quick Start**

### **🎯 SUPER EASY WAY (Recommended):**

**🐧 Mac/Linux:**

```bash
./start-dev.sh
```

**🪟 Windows:**

```powershell
start-dev.bat
```

**💻 Any Platform:**

```bash
npm run dev:full
```

**That's it! Everything is handled automatically.** ✨

### **📋 What the Scripts Do:**

1. ✅ Start PostgreSQL database in Docker
2. ✅ Wait for database to be ready
3. ✅ Generate Prisma client for TypeScript
4. ✅ Apply database schema migrations
5. ✅ Seed demo accounts automatically
6. ✅ Start Next.js development server
7. ✅ Show demo account credentials

### **For Professor (Demo):**

```bash
docker-compose up --build
```

Then visit: http://localhost:3000

### **Manual Setup (If Scripts Don't Work):**

**🐧 Mac/Linux:**

```bash
npm install
docker-compose up -d db
npx prisma generate --schema=database/prisma/schema.prisma
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed
npm run dev
```

**🪟 Windows:**

```powershell
npm install
docker-compose up -d db
npx prisma generate --schema=database/prisma/schema.prisma
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed
npm run dev
```

---

## 🧪 **Demo Accounts**

- **📧 professor@uexam.com** | Password: `professor123`
- **📧 teacher@uexam.com** | Password: `teacher123`

---

## 📁 **Project Structure**

```
team-8-capstone/
├── app/                    # 🎨 FRONTEND CODE
│   ├── (features)/        # Route group - organizes code, doesn't affect URLs
│   │   ├── auth/          # Authentication features
│   │   │   └── login/     # /auth/login
│   │   └── dashboard/     # /dashboard
│   ├── page.tsx           # Homepage
│   ├── components/        # Reusable UI pieces
│   ├── lib/               # Shared utilities
│   └── api/               # 🔌 BACKEND CODE
│       └── auth/          # Authentication APIs
├── database/              # 🗃️ DATABASE CODE
│   └── prisma/           # Database schema & migrations
│       ├── schema.prisma # Database structure
│       ├── migrations/   # Database version history
│       └── seed.ts       # Sample data
├── test/                  # 🧪 TEST CODE
│   └── features/         # Feature-based test organization
├── types/                 # TypeScript definitions
├── generated/             # Auto-generated files
│   └── prisma/           # Generated Prisma client
├── start-dev.sh          # Mac/Linux startup script
├── start-dev.bat         # Windows startup script
├── docker-compose.yml     # Docker setup
└── package.json          # Project settings
```

### **📂 CSS Organization Strategy**

When you need component-specific styles, organize them alongside your components:

```
app/(features)/auth/login/
├── page.tsx
├── styles.css              # When needed
└── components/
    ├── LoginForm.tsx
    └── LoginForm.css        # When needed
```

**CSS Options:**

- **Tailwind CSS** (current) - For most styling needs
- **CSS Modules** (`styles.module.css`) - For component-specific styles
- **Regular CSS** (`styles.css`) - For feature-specific styles

### **🚀 Adding New Features**

To add a new feature (courses, exams, analytics), create folders in `(features)`:

```
app/(features)/
├── auth/                   # Existing
├── dashboard/              # Existing
├── courses/page.tsx        # URL: /courses
├── exams/page.tsx         # URL: /exams
└── analytics/page.tsx     # URL: /analytics
```

---

## 🗃️ **About Prisma: Why No init.sql?**

### **What is Prisma?**

**Prisma = Type-safe PostgreSQL helper**

- 🔧 **Makes database queries easier** (no more complex SQL)
- 📝 **Provides TypeScript types** (catches errors before they happen)
- 🔄 **Handles database migrations** (keeps everyone's database in sync)
- 🎯 **Industry standard** (used by Netflix, Shopify, etc.)

**Think of it as:** Google Translate for talking to PostgreSQL - you write simple code, Prisma translates it to SQL.

### **Why We Don't Need init.sql Anymore**

| **❌ Old Way (init.sql)**     | **✅ New Way (Prisma)**          |
| ----------------------------- | -------------------------------- |
| Manual SQL table creation     | Automatic migrations from schema |
| Raw SQL with potential typos  | Type-safe TypeScript operations  |
| Hardcoded demo data           | Proper bcrypt-hashed passwords   |
| No version control for schema | Full migration history tracking  |
| Missing NextAuth tables       | Complete authentication schema   |

### **What Handles Each Task Now:**

**🏗️ Database Schema:**

```bash
# OLD: Manual SQL file
psql < init.sql

# NEW: Prisma migrations
npx prisma migrate deploy --schema=database/prisma/schema.prisma
```

**🌱 Sample Data:**

```bash
# OLD: Raw SQL inserts
INSERT INTO users (name, email, password_hash)...

# NEW: TypeScript with proper security
npm run db:seed  # Runs database/prisma/seed.ts
```

**📊 Performance:**

```prisma
# NEW: Declarative in schema.prisma
model User {
  email String @unique  # Auto-creates index
  @@index([teacherId])   # Custom indexes
}
```

### **The Generated Magic:**

When you run `npx prisma generate`, Prisma creates a `generated/` folder with:

- **584KB of TypeScript definitions** - Every model, every field, fully typed
- **18MB database engine** - The actual PostgreSQL communication layer
- **Complete CRUD operations** - Type-safe create, read, update, delete

**Example of the magic:**

```typescript
// Before: Prone to errors, no autocomplete
const result = await db.query("SELECT * FROM users WHERE email = ?", [email]);

// After: Full type safety and IntelliSense!
const user = await prisma.user.findUnique({
  where: { email },
  include: { courses: true, questions: true },
});
// TypeScript knows: user.name, user.email, user.courses[], etc. 🎉
```

---

## 🪟 **Windows Users - Setup Guide**

### **Prerequisites:**

1. **🐳 Docker Desktop** - Download from https://www.docker.com/products/docker-desktop/

   - Enable WSL2 integration during installation
   - Restart computer after installation

2. **📦 Node.js** - Download from https://nodejs.org/
   - Use LTS version (Long Term Support)
   - This installs both Node.js and npm

### **Recommended Setup:**

- **✅ Use PowerShell** (comes with Windows 10/11)
- **✅ Use VS Code** as your editor
- **✅ Consider WSL2** for better Docker performance

### **WSL2 Setup (Optional but Recommended):**

```powershell
# 1. Enable WSL2 (run as Administrator)
wsl --install

# 2. Install Ubuntu from Microsoft Store
# 3. Clone project in WSL2 and work from there
```

### **Windows-Specific Commands:**

**Check if Docker is running:**

```powershell
docker --version
docker-compose --version
```

**Troubleshooting Windows:**

- If Docker commands fail: Make sure Docker Desktop is running
- If npm commands fail: Make sure you installed Node.js
- If port 3000 is busy: Next.js will auto-switch to 3001

---

## 🎨 **Frontend Development**

### **1. Adding a New Page**

**Example: Create a Courses page**

```tsx
// app/courses/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function CoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      const data = await response.json();
      setCourses(data.courses);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading courses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">My Courses</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold">{course.name}</h3>
            <p className="text-gray-600">{course.description}</p>
            <div className="mt-4">
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                View Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Result:** Visit http://localhost:3000/courses

### **2. Creating Reusable Components**

**Example: Course Card Component**

```tsx
// app/components/CourseCard.tsx
interface CourseCardProps {
  course: {
    id: string;
    name: string;
    description: string;
  };
  onViewCourse: (courseId: string) => void;
}

export default function CourseCard({ course, onViewCourse }: CourseCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-2">{course.name}</h3>
      <p className="text-gray-600 mb-4">{course.description}</p>

      <div className="flex gap-2">
        <button
          onClick={() => onViewCourse(course.id)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          View Course
        </button>
        <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
          Edit
        </button>
      </div>
    </div>
  );
}
```

**Use it:**

```tsx
import CourseCard from "../components/CourseCard";

// In your page:
<CourseCard
  course={course}
  onViewCourse={(id) => router.push(`/courses/${id}`)}
/>;
```

### **3. Styling with Tailwind CSS**

**Common Patterns:**

```tsx
// Buttons
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Primary Button
</button>

// Cards
<div className="bg-white p-6 rounded-lg shadow hover:shadow-lg">
  Card Content
</div>

// Form Inputs
<input
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter text..."
/>

// Layout
<div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 py-8">
    Page Content
  </div>
</div>
```

---

## 🔌 **Backend Development**

### **1. Creating API Endpoints**

**Example: Courses API**

```typescript
// app/api/courses/route.ts
import { PrismaClient } from "../../../generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

const prisma = new PrismaClient();

// GET - Fetch all courses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await prisma.course.findMany({
      where: { teacherId: session.user.id },
      include: {
        _count: {
          select: { exams: true },
        },
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// POST - Create new course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        name,
        description,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Course created successfully", course },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
```

### **2. Working with Individual Records**

**Example: Single Course API**

```typescript
// app/api/courses/[id]/route.ts
import { PrismaClient } from "../../../../generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../lib/auth";

const prisma = new PrismaClient();

// GET - Fetch single course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        teacher: { select: { name: true, email: true } },
        exams: { select: { id: true, title: true, createdAt: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

// PUT - Update course
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, description } = await request.json();

    const course = await prisma.course.update({
      where: { id: params.id },
      data: { name, description },
    });

    return NextResponse.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.course.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
```

---

## 🗃️ **Database Development (Prisma + PostgreSQL)**

### **1. Understanding the Database Schema**

**Our current schema** (in `database/prisma/schema.prisma`):

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?
  role          String    @default("teacher")
  createdAt     DateTime  @default(now())

  courses       Course[]   // One user can have many courses
  questions     Question[] // One user can create many questions
  exams         Exam[]     // One user can create many exams
}

model Course {
  id            String   @id @default(cuid())
  name          String
  description   String?
  teacherId     String
  createdAt     DateTime @default(now())

  teacher       User     @relation(fields: [teacherId], references: [id])
  exams         Exam[]   // One course can have many exams
}

model Question {
  id            String   @id @default(cuid())
  questionText  String
  optionA       String
  optionB       String
  optionC       String
  optionD       String
  correctAnswer String   // A, B, C, or D
  subject       String?
  difficulty    String   @default("medium")
  teacherId     String
  createdAt     DateTime @default(now())

  teacher       User            @relation(fields: [teacherId], references: [id])
  examQuestions ExamQuestion[]  // Many-to-many with exams
}
```

### **2. Common Database Operations**

**Create:**

```typescript
// Create a new course
const course = await prisma.course.create({
  data: {
    name: "Introduction to JavaScript",
    description: "Learn JS basics",
    teacherId: userId,
  },
});
```

**Read:**

```typescript
// Get all courses for a user
const courses = await prisma.course.findMany({
  where: { teacherId: userId },
  include: { teacher: true }, // Include teacher info
});

// Get one specific course
const course = await prisma.course.findUnique({
  where: { id: courseId },
});
```

**Update:**

```typescript
// Update a course
const updatedCourse = await prisma.course.update({
  where: { id: courseId },
  data: {
    name: "Advanced JavaScript",
    description: "Deep dive into JS",
  },
});
```

**Delete:**

```typescript
// Delete a course
await prisma.course.delete({
  where: { id: courseId },
});
```

### **3. Adding New Database Tables**

**Step 1:** Edit `database/prisma/schema.prisma`

```prisma
model StudentResult {
  id          String   @id @default(cuid())
  studentName String
  examId      String
  score       Int
  totalPoints Int
  percentage  Float
  completedAt DateTime @default(now())

  exam        Exam     @relation(fields: [examId], references: [id])
}
```

**Step 2:** Create migration

```bash
npx prisma migrate dev --name add_student_results --schema=database/prisma/schema.prisma
```

**Step 3:** Generate new Prisma client

```bash
npx prisma generate --schema=database/prisma/schema.prisma
```

---

## 🛠️ **Development Commands**

### **Database Commands:**

```bash
npm run db:migrate     # Apply database changes
npm run db:seed        # Add sample data
npm run db:studio      # Open database GUI (http://localhost:5555)
npm run db:reset       # Reset database (careful!)
```

### **Development Commands:**

```bash
npm run dev           # Start development server
npm run dev:full      # Full setup + start development server
npm run build         # Build for production
npm run start         # Start production server
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run lint          # Check code style
```

### **Docker Commands:**

```bash
docker-compose up --build    # Build and start everything
docker-compose up           # Start (after first build)
docker-compose down         # Stop everything
docker-compose logs app     # See app logs
docker-compose logs db      # See database logs
```

---

## 🧪 **Testing**

We have comprehensive tests covering authentication and placeholders for future features.

### **Running Tests:**

```bash
# Run all tests
npm test

# Watch mode (reruns on file changes)
npm run test:watch

# Test specific feature
npm test -- test/features/auth

# Test single file
npm test -- LoginPage.test.tsx
```

### **Test Coverage:**

- **✅ Authentication System** (52 tests)
  - Login page functionality and validation
  - Registration flow and error handling
  - Form interactions and accessibility
- **⏳ Feature Placeholders** (3 tests)
  - Course management tests (ready for implementation)
  - Exam system tests (ready for implementation)
  - Question bank tests (ready for implementation)

### **Test Structure:**

```
test/
├── features/          # Feature-based organization
│   ├── auth/         # Authentication tests
│   ├── courses/      # Course management tests
│   ├── exams/        # Exam system tests
│   └── questions/    # Question bank tests
└── README.md         # Testing guide
```

### **Testing Framework:**

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation

### **Writing New Tests:**

See `test/README.md` for comprehensive testing guidelines and examples.

### **CI Integration:**

Tests run automatically on every push and pull request via GitHub Actions.

---

## 🆘 **Troubleshooting**

### **Startup Script Issues:**

**🐧 Mac/Linux Script Problems:**

```bash
# If permission denied:
chmod +x start-dev.sh

# If script doesn't exist:
ls -la start-dev.sh

# Run manually if script fails:
docker-compose up -d db && sleep 3 && npx prisma generate --schema=database/prisma/schema.prisma && npx prisma migrate deploy --schema=database/prisma/schema.prisma && npm run db:seed && npm run dev
```

**🪟 Windows Script Problems:**

```powershell
# If script doesn't run in PowerShell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run in Command Prompt instead:
start-dev.bat

# Run manually if script fails:
docker-compose up -d db
timeout /t 3
npx prisma generate --schema=database/prisma/schema.prisma
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed
npm run dev
```

### **Common Issues:**

**1. "Prisma Client not found"**

```bash
npx prisma generate --schema=database/prisma/schema.prisma
```

**2. "Database connection error"**

```bash
# Make sure database is running
docker-compose up -d db
```

**3. "Module not found"**

```bash
npm install
```

**4. "Something broke!"**

- ✅ Check terminal for error messages
- ✅ Check browser console (F12)
- ✅ Make sure `npm run dev` is running
- ✅ Restart development server

**5. "Port 3000 is busy"**

- ✅ Next.js will automatically use port 3001
- ✅ Or manually specify: `npm run dev -- --port 3002`

**6. "Demo accounts don't work"**

- ✅ Make sure you ran `npm run db:seed`
- ✅ Check database is running: `docker-compose ps`
- ✅ Verify at: http://localhost:3001 (not 3000 if port was busy)

**7. "Database Migration Drift/Conflict" ⚠️**

If you see errors like:

- `Drift detected: Your database schema is not in sync with your migration history`
- `Migration failed`
- Database constraint conflicts

**Quick Fix (Recommended for Development):**

```bash
# Use the helper script:
./migrate-fix.sh

# Or reset via start script:
./start-dev.sh --reset
```

**Why This Happens:**

- Multiple developers working on schema changes
- Old local database state conflicts with new migrations
- Schema changes made outside of migrations

**Prevention Tips:**

- Always `git pull` before working on database changes
- Don't modify schema directly, use migrations
- When in doubt, reset your local development database

---

## 🚀 **Getting Started Checklist**

### **For Team Members:**

1. **📥 Setup Project**

   - [ ] Clone repository
   - [ ] Run `npm install`
   - [ ] Run startup script: `./start-dev.sh` or `start-dev.bat`
   - [ ] Visit http://localhost:3000

2. **🧪 Test Authentication**

   - [ ] Login with: `professor@uexam.com` / `professor123`
   - [ ] Check dashboard works
   - [ ] Try logout

3. **🧪 Run Tests**

   - [ ] Run `npm test` to see all tests pass
   - [ ] Check test coverage report
   - [ ] Read `test/README.md` for testing guidelines
   - [ ] Try `npm run test:watch` for development

4. **👀 Explore Code**

   - [ ] Look at `app/login/page.tsx`
   - [ ] Check `app/api/auth/password-reset/route.ts`
   - [ ] Open `database/prisma/schema.prisma`
   - [ ] Run `npm run db:studio` to see database
   - [ ] Review `test/features/auth/LoginPage.test.tsx`

5. **🛠️ Make First Change**

   - [ ] Edit homepage (`app/page.tsx`)
   - [ ] Add your name to the welcome message
   - [ ] Save and see it update automatically
   - [ ] Run tests to ensure nothing broke

6. **🎯 Pick Your First Feature**
   - [ ] Course management pages
   - [ ] Question bank interface
   - [ ] Exam creation wizard
   - [ ] Analytics dashboard
   - [ ] Write tests for your feature!

---

## 👥 **Team 8 Members**

- Levi Boswell
- Kian Shirvani
- Nariman Milanfar
- Lucas Xu
- Ming Xu
- Berat Celik
- Caitlin Chang

---

## 🛠️ **Tech Stack**

- **Frontend**: Next.js + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + NextAuth.js
- **Database**: PostgreSQL
- **Deployment**: Docker + Docker Compose

---

## 🔥 **Features**

- ✅ **User Authentication** (Login/Logout) - Only admins can create accounts
- ✅ **Protected Dashboard** with user session
- ✅ **Database Ready** with complete schema
- ✅ **Fully Dockerized** for easy deployment
- ⏳ **Course Management** (to be built)
- ⏳ **Question Bank** (to be built)
- ⏳ **Exam Creation** (to be built)
- ⏳ **PDF Export** (to be built)
- ⏳ **Analytics Dashboard** (to be built)

---

## 🎯 **Project Status**

✅ **Authentication System Complete**
✅ **Database Schema Ready**
✅ **Docker Setup Complete**
✅ **Development Environment Ready**
🚀 **Ready for Feature Development**

---

## 🎉 **You're Ready to Code!**

**Remember:**

- 🚀 **Start small** - Add one page at a time
- 🔄 **Copy existing patterns** - Look at login and admin pages for examples
- 💬 **Ask questions** - Better to ask than guess!
- 🧪 **Test frequently** - Save often and check your browser
- 📚 **Use the tools** - Prisma Studio is great for checking database

**Your foundation is solid - now build something amazing!** ✨

---

**Happy coding, Team 8!** 🎉
