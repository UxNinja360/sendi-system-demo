import React, { useMemo } from 'react';
import { Trophy, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Target } from 'lucide-react';
import { Delivery } from '../../../types/delivery.types';

interface PerformanceDashboardProps {
  deliveries: Delivery[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ deliveries }) => {
  
  // חישוב מדדי ביצועים
  const stats = useMemo(() => {
    const now = Date.now();
    
    // משלוחים פעילים (לא delivered ולא cancelled)
    const activeDeliveries = deliveries.filter(d => 
      d.status !== 'delivered' && d.status !== 'cancelled'
    );
    
    // משלוחים שבוטלו
    const cancelledDeliveries = deliveries.filter(d => d.status === 'cancelled');
    
    // משלוחים שהושלמו
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
    
    // משלוחים קריטיים (מעל 7 דקות)
    const criticalDeliveries = activeDeliveries.filter(d => {
      const elapsed = Math.floor((now - new Date(d.createdAt).getTime()) / 60000);
      return elapsed >= 7;
    });
    
    // משלוחים שעברו 10 דקות
    const overdueDeliveries = deliveries.filter(d => {
      const elapsed = Math.floor((now - new Date(d.createdAt).getTime()) / 60000);
      return elapsed > 10 && d.status !== 'delivered' && d.status !== 'cancelled';
    });
    
    // חישוב ציון
    const totalDeliveries = deliveries.length;
    const failedDeliveries = cancelledDeliveries.length + overdueDeliveries.length;
    const successRate = totalDeliveries > 0 
      ? Math.round(((totalDeliveries - failedDeliveries) / totalDeliveries) * 100)
      : 100;
    
    // סטטוס כללי
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (overdueDeliveries.length > 0 || cancelledDeliveries.length > 0) {
      status = 'critical';
    } else if (criticalDeliveries.length > 0) {
      status = 'warning';
    } else if (activeDeliveries.length > 0) {
      status = 'good';
    } else {
      status = 'excellent';
    }
    
    return {
      total: totalDeliveries,
      active: activeDeliveries.length,
      completed: completedDeliveries.length,
      cancelled: cancelledDeliveries.length,
      critical: criticalDeliveries.length,
      overdue: overdueDeliveries.length,
      successRate,
      status,
    };
  }, [deliveries]);
  
  // צבעי סטטוס
  const statusColors = {
    excellent: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-500 dark:border-green-600',
      label: '🏆 מצוין!',
    },
    good: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500 dark:border-blue-600',
      label: '✓ טוב',
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-500 dark:border-yellow-600',
      label: '⚠️ זהירות',
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500 dark:border-red-600',
      label: '❌ קריטי',
    },
  };
  
  const currentStatus = statusColors[stats.status];
  
  return (
    null
  );
};
