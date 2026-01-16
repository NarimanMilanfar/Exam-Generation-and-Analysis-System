"use client";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  courseId: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
  user: User;
}

interface ActivityItemProps {
  activity: ActivityLog;
  compact?: boolean;
}

export default function ActivityItem({ activity, compact = false }: ActivityItemProps) {
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (compact) {
      return date.toLocaleDateString();
    }
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'text-green-600 bg-green-100';
    if (action.includes('UPDATED')) return 'text-blue-600 bg-blue-100';
    if (action.includes('DELETED')) return 'text-red-600 bg-red-100';
    if (action.includes('SHARED') || action.includes('COLLABORATOR')) return 'text-purple-600 bg-purple-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getResourceDisplayName = (activity: ActivityLog) => {
    if (!activity.details) return activity.resourceId;
    
    try {
      const details = JSON.parse(activity.details);
      
      switch (activity.resource) {
        case 'collaborator':
          return details.name || activity.resourceId;
        case 'exam':
          return details.title || activity.resourceId;
        case 'question':
          return details.text ? details.text.substring(0, 50) + (details.text.length > 50 ? '...' : '') : activity.resourceId;
        case 'question_bank':
          return details.name || details.title || activity.resourceId;
        case 'course':
          return details.name || details.title || activity.resourceId;
        default:
          return details.name || details.title || details.text || activity.resourceId;
      }
    } catch (error) {
      console.error('Error parsing activity details:', error);
      return activity.resourceId;
    }
  };

  return (
    <div className={`flex items-start space-x-3 ${compact ? 'py-2' : 'py-4'} hover:bg-gray-50`}>
      <div className="flex-shrink-0">
        <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-200 flex items-center justify-center`}>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
            {activity.user.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>
            {activity.user.name}
          </p>
          <span className={`px-2 py-1 ${compact ? 'text-xs' : 'text-xs'} font-medium rounded-full ${getActionColor(activity.action)}`}>
            {formatAction(activity.action)}
          </span>
        </div>
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 mt-1`}>
          {activity.resource && `${activity.resource} `}
          <span className="text-gray-700">
            {getResourceDisplayName(activity)}
          </span>
        </p>
        <p className={`${compact ? 'text-xs' : 'text-xs'} text-gray-400 mt-1`}>
          {formatDate(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}