import { appEnv } from "@/config/env";
import { AuthMockService } from "./mock/authMockService";
import { AuthService } from "./authService";
import { HttpTrainsetService } from "./trainsetService";
import type { ApiServices } from "./types";

export const createServices = (): ApiServices => {
  if (appEnv.enableMockApi) {
    return {
      auth: new AuthMockService(),
      trainsets: new HttpTrainsetService(),
    };
  }

  return {
    auth: new AuthService(),
    trainsets: new HttpTrainsetService(),
  };
};
