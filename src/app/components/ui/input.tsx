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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-secondary">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full 
            ${icon ? 'pr-10' : 'pr-4'} 
            pl-4 py-2.5 
            rounded-[var(--app-radius-sm)]
            border border-transparent
            bg-app-surface-raised
            text-app-text
            placeholder:text-app-text-muted
            focus:border-app-brand-solid
            outline-none 
            transition-colors
            ${error ? 'border-app-error-text' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-app-error-text">{error}</p>
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
          <div className="pointer-events-none absolute right-3 text-app-text-secondary">
            {icon}
          </div>
        )}
        <select
          className={`
            w-full 
            ${icon ? 'pr-10' : 'pr-4'} 
            pl-4 py-2.5 
            rounded-[var(--app-radius-sm)]
            border border-transparent
            bg-app-surface-raised
            text-app-text
            focus:border-app-brand-solid
            outline-none 
            transition-colors 
            cursor-pointer
            ${error ? 'border-app-error-text' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && (
        <p className="mt-1 text-xs text-app-error-text">{error}</p>
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
