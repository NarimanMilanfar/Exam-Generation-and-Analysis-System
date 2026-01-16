@echo off
echo 🚀 Starting UExam Development Environment...

REM Start database
echo 📊 Starting database...
docker-compose up -d db

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 3 /nobreak >nul

REM Check if database exists and is accessible
echo 🔍 Checking database connection...
npx prisma db pull --schema=database/prisma/schema.prisma --silent >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Database not accessible or doesn't exist. Setting up...
)

REM Generate Prisma client first
echo 🔧 Generating Prisma client...
npx prisma generate --schema=database/prisma/schema.prisma

REM Check migration status and apply if needed
echo 📋 Checking migration status...
npx prisma migrate status --schema=database/prisma/schema.prisma > migration_status.tmp 2>&1

findstr /C:"Following migration" migration_status.tmp >nul
if not errorlevel 1 (
    echo 🔄 Applying pending migrations...
    npx prisma migrate dev --schema=database/prisma/schema.prisma --skip-generate
    goto :migration_done
)

findstr /C:"Database schema is not up to date" migration_status.tmp >nul
if not errorlevel 1 (
    echo 🔄 Database schema is not up to date. Applying migrations...
    npx prisma migrate dev --schema=database/prisma/schema.prisma --skip-generate
    goto :migration_done
)

findstr /C:"Database schema is up to date" migration_status.tmp >nul
if not errorlevel 1 (
    echo ✅ Database migrations are up to date
    goto :migration_done
)

echo 🔄 Ensuring database schema is in sync...
npx prisma db push --schema=database/prisma/schema.prisma --skip-generate

:migration_done
del migration_status.tmp >nul 2>&1

REM Final check - ensure database schema is in sync
echo 🔧 Ensuring database schema is in sync...
npx prisma db push --schema=database/prisma/schema.prisma --skip-generate

REM Regenerate Prisma client after schema sync
echo 🔧 Regenerating Prisma client...
npx prisma generate --schema=database/prisma/schema.prisma

REM Seed database
echo 🌱 Seeding database with demo accounts...
npm run db:seed

REM Start development server
echo 🎉 Starting development server...
echo.
echo Demo accounts ready:
echo 📧 professor@uexam.com ^| Password: professor123
echo 📧 teacher@uexam.com ^| Password: teacher123
echo.
echo 🌐 Application: http://localhost:3000
echo 📧 Emails will be sent via Gmail
echo.

npm run dev 