import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  icon, 
  error,
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#a3a3a3]">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full 
            ${icon ? 'pr-10' : 'pr-4'} 
            pl-4 py-2.5 
            bg-[#f5f5f5] dark:bg-[#404040] 
            border border-transparent 
            focus:border-[#16a34a] dark:focus:border-[#22c55e] 
            rounded-lg 
            text-[#0d0d12] dark:text-[#fafafa] 
            placeholder:text-[#a3a3a3] 
            outline-none 
            transition-colors
            ${error ? 'border-red-500 dark:border-red-400' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  icon, 
  error,
  className = '',
  children,
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute right-3 pointer-events-none text-[#737373] dark:text-[#a3a3a3]">
            {icon}
          </div>
        )}
        <select
          className={`
            w-full 
            ${icon ? 'pr-10' : 'pr-4'} 
            pl-4 py-2.5 
            bg-[#f5f5f5] dark:bg-[#404040] 
            border border-transparent 
            focus:border-[#16a34a] dark:focus:border-[#22c55e] 
            rounded-lg 
            text-[#0d0d12] dark:text-[#fafafa] 
            outline-none 
            transition-colors 
            cursor-pointer
            ${error ? 'border-red-500 dark:border-red-400' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

interface SearchInputProps extends Omit<InputProps, 'icon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  onSearch,
  onChange,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onSearch?.(e.target.value);
  };

  return (
    <Input
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      }
      onChange={handleChange}
      {...props}
    />
  );
};
