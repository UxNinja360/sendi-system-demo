import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ConstructionPageProps {
  title: string;
  icon: LucideIcon;
}

export const ConstructionPage: React.FC<ConstructionPageProps> = ({ title, icon: IconComponent }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in">
    <div className="bg-[#f5f5f5] dark:bg-[#171717] p-6 rounded-full mb-6">
      <IconComponent className="w-12 h-12 text-[#737373] dark:text-[#a3a3a3]" />
    </div>
    <h2 className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">{title}</h2>
    <p className="text-[#666d80] dark:text-[#a3a3a3] max-w-md">
      מודול זה נמצא כרגע בפיתוח ויעלה לאוויר בקרוב.
    </p>
  </div>
);