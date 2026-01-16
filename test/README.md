# 🧪 UExam Testing Guide

This directory contains all tests for the UExam project, organized by feature for better maintainability.

## 📁 **Test Structure**

```
test/
├── features/               # Feature-based test organization
│   ├── auth/              # Authentication tests
│   │   ├── LoginPage.test.tsx
│   │   └── index.test.ts
│   ├── courses/           # Course management tests
│   ├── exams/             # Exam creation/taking tests
│   ├── questions/         # Question bank tests
│   └── api/               # API endpoint tests
├── simple.test.ts         # Basic test for CI
├── jest.setup.js          # Jest configuration
└── README.md              # This file
```

## 🚀 **Running Tests**

### **All Tests:**

```bash
npm test
```

### **Watch Mode (Development):**

```bash
npm run test:watch
```

### **Specific Feature:**

```bash
npm test -- test/features/auth
```

### **Single Test File:**

```bash
npm test -- LoginPage.test.tsx
```

## 📊 **Test Coverage**

### **Generate Coverage Report:**

```bash
# Run tests with coverage
npm run test:coverage

# Run tests with coverage in watch mode
npm run test:coverage:watch

# Generate coverage and open HTML report
npm run test:coverage:open

# Generate coverage for CI (no watch mode)
npm run test:coverage:ci
```

### **Coverage Reports:**

The coverage system generates multiple report formats:

- **CLI Table**: Shows in terminal (like the example below)
- **HTML Report**: `coverage/lcov-report/index.html` - Interactive browsable report
- **LCOV Report**: `coverage/lcov.info` - For CI/CD integration
- **JSON Report**: `coverage/coverage-final.json` - Machine-readable format

### **Current Coverage Status:**

```
-------------------------|---------|----------|---------|---------|
File                     | % Stmts | % Branch | % Funcs | % Lines |
-------------------------|---------|----------|---------|---------|
All files                |   18.50 |    14.15 |   23.57 |   18.21 |
  Frontend Components    |   ~15%  |    ~12%  |   ~20%  |   ~15%  |
  Backend APIs           |   ~10%  |    ~8%   |   ~15%  |   ~12%  |
  Utilities & Libraries  |   ~70%  |    ~65%  |   ~75%  |   ~70%  |
-------------------------|---------|----------|---------|---------|
```

### **Coverage Thresholds:**

Current minimum thresholds set to **50%** for all metrics:
- **Statements**: 50%
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%

*Note: These thresholds will fail the build if not met. Adjust in `jest.config.js` if needed.*

### **What's Covered:**

✅ **Included in Coverage:**
- `app/**/*.{js,jsx,ts,tsx}` - All frontend components
- `app/api/**/*.{js,ts}` - All API routes
- `app/lib/**/*.{js,ts}` - Utility libraries
- `app/types/**/*.ts` - Type definitions
- `middleware.ts` - Next.js middleware
- `lib/**/*.{js,ts}` - Core libraries

❌ **Excluded from Coverage:**
- `app/**/page.tsx` - Next.js page components
- `app/**/layout.tsx` - Next.js layout components
- `app/**/loading.tsx` - Next.js loading components
- `app/**/error.tsx` - Next.js error components
- `app/globals.css` - CSS files
- `**/*.d.ts` - TypeScript declaration files
- `database/**` - Database schema and migrations
- `public/**` - Static assets
- `*.config.{js,ts}` - Configuration files

### **Improving Coverage:**

1. **Identify Low Coverage Areas:**
   ```bash
   npm run test:coverage:open
   ```
   
2. **Focus on Critical Paths:**
   - API endpoints
   - Business logic in `app/lib/`
   - Core components

3. **Write Tests for:**
   - Authentication flows
   - Form validation
   - API error handling
   - Data transformation

4. **Use Coverage to Find:**
   - Uncovered branches (conditional logic)
   - Unused functions
   - Missing error handling tests

## ✅ **Current Test Coverage**

### **✅ Completed Features:**

- **Authentication System** (26 tests)
  - ✅ Login Page (22 tests)
    - Component rendering
    - Form interactions
    - Authentication flow
    - Error handling
    - Form validation
  - ✅ Feature organization (4 tests)
  - ❌ Registration removed for security - only admins create accounts

### **⏳ Placeholder Features:**

- **Course Management** (1 placeholder test)
- **Exam Management** (1 placeholder test)
- **Question Bank** (1 placeholder test)

## 🛠️ **Testing Framework Setup**

- **Jest** - Test runner and framework
- **React Testing Library** - Component testing utilities
- **@testing-library/user-event** - User interaction testing
- **@testing-library/jest-dom** - DOM testing matchers

## 📝 **Writing New Tests**

### **1. Component Tests**

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### **2. API Route Tests**

```typescript
import { GET } from './route';

describe('/api/my-endpoint', () => {
  test('returns correct response', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
```

### **3. Utility Function Tests**

```typescript
import { myUtility } from './utils';

describe('myUtility', () => {
  test('processes input correctly', () => {
    expect(myUtility('input')).toBe('expected output');
  });
});
```

## 🎯 **Best Practices**

1. **Write tests before or alongside code** (TDD approach)
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Test edge cases and error conditions**
6. **Keep tests isolated and independent**
7. **Use coverage to identify gaps, not as the only quality metric**

## 🔧 **Coverage Configuration**

Coverage settings can be adjusted in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50
  }
}
```

## 📈 **Monitoring Coverage**

- **Local Development**: Use `npm run test:coverage:watch`
- **CI/CD**: Use `npm run test:coverage:ci`
- **Pull Requests**: Coverage reports help identify untested code
- **Regular Review**: Monitor coverage trends over time

---

*Total Test Suites: **47** | Total Tests: **608** | All Tests: **✅ PASSING***
