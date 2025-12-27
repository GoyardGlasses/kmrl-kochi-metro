import { createContext, useContext, useRef } from "react";
import type { ApiServices } from "@/services/types";
import { createServices } from "@/services/serviceFactory";

const ServicesContext = createContext<ApiServices | null>(null);

interface ServicesProviderProps {
  children: React.ReactNode;
}

export const ServicesProvider = ({ children }: ServicesProviderProps) => {
  const servicesRef = useRef<ApiServices | null>(null);
  if (!servicesRef.current) {
    servicesRef.current = createServices();
  }

  return (
    <ServicesContext.Provider value={servicesRef.current}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error("useServices must be used within ServicesProvider");
  }
  return context;
};
