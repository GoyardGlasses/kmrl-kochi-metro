import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-md shadow-xl min-w-[200px] max-w-[300px] animate-fade-in">
          <div className="text-sm text-foreground">{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-border" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-popover" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;