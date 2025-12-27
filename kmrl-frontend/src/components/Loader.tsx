import { cn } from "@/lib/utils";

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loader = ({ message = "Loading...", fullScreen = false }: LoaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        fullScreen ? "min-h-screen" : "py-12"
      )}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};
