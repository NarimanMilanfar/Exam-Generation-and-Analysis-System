#!/bin/bash

echo "🗄️  UExam Migration Helper"
echo "=========================="
echo ""

# Parse command line arguments
ACTION=""

while [[ $# -gt 0 ]]; do
  case $1 in
    reset)
      ACTION="reset"
      shift
      ;;
    status)
      ACTION="status"
      shift
      ;;
    apply)
      ACTION="apply"
      shift
      ;;
    --help|help)
      echo "Usage: $0 <command>"
      echo ""
      echo "Commands:"
      echo "  status    Check current migration status"
      echo "  apply     Apply pending migrations"
      echo "  reset     Reset database and reapply all migrations (DELETES ALL DATA)"
      echo "  help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./migrate-dev.sh status"
      echo "  ./migrate-dev.sh apply"
      echo "  ./migrate-dev.sh reset"
      exit 0
      ;;
    *)
      echo "Unknown command: $1"
      echo "Use 'help' for usage information"
      exit 1
      ;;
  esac
done

if [ -z "$ACTION" ]; then
    echo "❌ No command specified. Use 'help' for usage information."
    exit 1
fi

# Ensure database is running
echo "📊 Ensuring database is running..."
docker-compose up -d db
sleep 2

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=database/prisma/schema.prisma

case $ACTION in
    status)
        echo "📋 Checking migration status..."
        npx prisma migrate status --schema=database/prisma/schema.prisma
        ;;
    apply)
        echo "🔄 Applying pending migrations..."
        npx prisma migrate dev --schema=database/prisma/schema.prisma
        if [ $? -eq 0 ]; then
            echo "✅ Migrations applied successfully!"
            echo "🌱 Seeding database..."
            npm run db:seed
        else
            echo "❌ Migration failed! Consider using: ./migrate-dev.sh reset"
        fi
        ;;
    reset)
        echo "⚠️  WARNING: This will DELETE ALL DATA and reset the database!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔄 Resetting database and applying all migrations..."
            npx prisma migrate reset --schema=database/prisma/schema.prisma --force --skip-seed
            echo "🌱 Seeding database..."
            npm run db:seed
            echo "✅ Database reset complete!"
        else
            echo "🚫 Reset cancelled."
        fi
        ;;
esac 