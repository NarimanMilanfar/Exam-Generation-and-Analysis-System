#!/bin/bash

echo "🚀 Starting UExam Development Environment..."

# Parse command line arguments
RESET_DB=false
SKIP_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --reset)
      RESET_DB=true
      shift
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --reset           Reset database and reapply all migrations from scratch"
      echo "  --skip-migrations Skip automatic migrations (manual migration required)"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Start database
echo "📊 Starting database..."
docker-compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 3

# Generate Prisma client first
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=database/prisma/schema.prisma

if [ "$SKIP_MIGRATIONS" = true ]; then
    echo "⚠️  Skipping automatic migrations (--skip-migrations flag used)"
    echo "📋 To apply migrations manually, run:"
    echo "   npx prisma migrate dev --schema=database/prisma/schema.prisma"
    echo ""
elif [ "$RESET_DB" = true ]; then
    echo "🔄 Resetting database and applying all migrations from scratch..."
    npx prisma migrate reset --schema=database/prisma/schema.prisma --force --skip-seed
else
    # Check migration status
    echo "📋 Checking migration status..."
    MIGRATION_STATUS=$(npx prisma migrate status --schema=database/prisma/schema.prisma 2>&1)
    
    if echo "$MIGRATION_STATUS" | grep -q "drift detected\|cannot be rolled back\|Migration.*failed"; then
        echo "⚠️  Migration conflict detected!"
        echo "🔄 This usually happens when team members have different migration states."
        echo ""
        echo "🛠️  RECOMMENDED SOLUTIONS:"
        echo "1. Reset your database: ./start-dev.sh --reset"
        echo "2. Skip auto-migrations: ./start-dev.sh --skip-migrations"
        echo "3. Apply migrations manually: npx prisma migrate dev --schema=database/prisma/schema.prisma"
        echo ""
        echo "📊 Migration Status Details:"
        echo "$MIGRATION_STATUS"
        echo ""
        echo "🚫 Skipping automatic migrations to prevent data loss."
        echo "   Please choose one of the solutions above."
        SKIP_MIGRATIONS=true
    elif echo "$MIGRATION_STATUS" | grep -q "Following migration.*have not yet been applied"; then
        echo "🔄 Applying pending migrations..."
        if ! npx prisma migrate dev --schema=database/prisma/schema.prisma --skip-generate; then
            echo "❌ Migration failed! Try: ./start-dev.sh --reset"
            exit 1
        fi
    elif echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
        echo "✅ Database migrations are up to date"
    else
        echo "🔄 Syncing database schema..."
        npx prisma db push --schema=database/prisma/schema.prisma --skip-generate
    fi
fi

if [ "$SKIP_MIGRATIONS" = false ]; then
    # Seed database
    echo "🌱 Seeding database with demo accounts..."
    npm run db:seed
fi

# Start development server
echo "🎉 Starting development server..."
echo ""
echo "Demo accounts ready:"
echo "📧 professor@uexam.com | Password: professor123" 
echo "📧 teacher@uexam.com | Password: teacher123"
echo ""
echo "🌐 Application: http://localhost:3000"
echo "📧 Emails will be sent via Gmail"
echo ""

npm run dev 