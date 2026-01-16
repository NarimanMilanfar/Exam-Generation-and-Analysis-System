#!/bin/bash

echo "🛠️  Database Migration Helper for UExam"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "database/prisma/schema.prisma" ]; then
    echo "❌ Error: Please run this from the project root directory"
    echo "   (where start-dev.sh is located)"
    exit 1
fi

echo "This script will help fix common migration issues."
echo ""
echo "Choose an option:"
echo "1. 🔄 Reset database (recommended for development)"
echo "2. 📋 Check migration status"
echo "3. 🔧 Generate Prisma client only"
echo "4. ❌ Cancel"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "⚠️  WARNING: This will delete all data in your local database!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🔄 Resetting database..."
            cd database
            npx prisma migrate reset --force
            cd ..
            echo "✅ Database reset complete!"
            echo "💡 You can now run ./start-dev.sh normally"
        else
            echo "❌ Reset cancelled"
        fi
        ;;
    2)
        echo "📋 Checking migration status..."
        cd database
        npx prisma migrate status
        cd ..
        ;;
    3)
        echo "🔧 Generating Prisma client..."
        cd database
        npx prisma generate
        cd ..
        echo "✅ Client generated!"
        ;;
    4)
        echo "❌ Cancelled"
        ;;
    *)
        echo "❌ Invalid choice"
        ;;
esac

echo ""
echo "💡 Quick Tips:"
echo "   • Always pull latest changes before running migrations"
echo "   • Use 'git status' to check if you have local schema changes"
echo "   • When in doubt, use option 1 (reset) for development"
echo "   • Ask team lead if you see migration conflicts in production" 