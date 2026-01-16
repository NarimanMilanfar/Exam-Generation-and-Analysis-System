"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  actionDescription: string;
  resource: string | null;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function AuditLogModal({ isOpen, onClose, userId, userName }: AuditLogModalProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const limit = 20;

  // Fetch audit logs
  const fetchAuditLogs = async (resetData: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentOffset = resetData ? 0 : offset;
      const response = await fetch(
        `/api/admin/users/${userId}/audit-logs?limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      
      if (resetData) {
        setAuditLogs(data.logs);
        setOffset(data.logs.length);
      } else {
        setAuditLogs(prev => [...prev, ...data.logs]);
        setOffset(prev => prev + data.logs.length);
      }
      
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Reset and fetch when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      setAuditLogs([]);
      setOffset(0);
      setHasMore(true);
      setSelectedLog(null);
      fetchAuditLogs(true);
    }
  }, [isOpen, userId]);

  // Load more logs
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchAuditLogs(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get status badge styling
  const getStatusBadge = (success: boolean) => {
    return success ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5"></div>
        Success
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></div>
        Failed
      </span>
    );
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    } else if (action.includes('FILE') || action.includes('UPLOAD') || action.includes('IMPORT')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      );
    } else if (action.includes('PASSWORD')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-black text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Audit Log</h2>
                <p className="text-sm text-gray-300">Activity history for {userName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading audit logs...</p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600">No audit logs found for this user</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <div className="p-6 space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${log.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{log.actionDescription}</h3>
                            {getStatusBadge(log.success)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {formatDate(log.createdAt)}
                          </p>
                          {log.details && (
                            <div className="text-sm text-gray-500">
                              {log.details.fileName && <span>File: {log.details.fileName}</span>}
                              {log.details.reason && <span>Reason: {log.details.reason}</span>}
                              {log.details.role && <span>Role: {log.details.role}</span>}
                            </div>
                          )}
                          {log.ipAddress && (
                            <p className="text-xs text-gray-400 mt-1">
                              IP: {log.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Action</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedLog.actionDescription}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">{getStatusBadge(selectedLog.success)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</dd>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</dd>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User Agent</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">{selectedLog.userAgent}</dd>
                  </div>
                )}
                {selectedLog.errorMessage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Error Message</dt>
                    <dd className="mt-1 text-sm text-red-600">{selectedLog.errorMessage}</dd>
                  </div>
                )}
                {selectedLog.details && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Additional Details</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 