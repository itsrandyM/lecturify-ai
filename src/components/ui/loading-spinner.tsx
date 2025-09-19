import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size]
      )} />
    </div>
  );
};

export const LoadingCard = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("bg-gradient-card rounded-lg p-6 animate-pulse", className)}>
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  </div>
);

export const LoadingState = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <LoadingSpinner size="lg" />
    <p className="text-muted-foreground animate-fade-in">{message}</p>
  </div>
);