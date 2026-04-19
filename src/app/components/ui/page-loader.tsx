import React from 'react';
import { DashboardSkeleton } from './skeletons/dashboard-skeleton';
import { FinanceSkeleton } from './skeletons/finance-skeleton';
import { EntitiesSkeleton } from './skeletons/entities-skeleton';
import { BusinessSkeleton } from './skeletons/business-skeleton';
import { GenericSkeleton } from './skeletons/generic-skeleton';

interface PageLoaderProps {
  page?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ page = 'generic' }) => {
  const getSkeletonComponent = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardSkeleton />;
      case 'finance':
      case 'checkout':
      case 'history':
        return <FinanceSkeleton />;
      case 'entities':
        return <EntitiesSkeleton />;
      case 'business':
        return <BusinessSkeleton />;
      case 'data':
      case 'settings':
      case 'live':
      default:
        return <GenericSkeleton />;
    }
  };

  return (
    <div className="w-full h-full animate-in fade-in duration-200">
      {getSkeletonComponent()}
    </div>
  );
};