import {
  DashboardKPIs,
  PersonaData,
  ParetoData,
  Momento,
  SimularPayload,
  SimularResponse,
  DecisaoAuditoria,
  ShapResponse,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });
  } catch (err: unknown) {
    throw new ApiError(
      0,
      `Falha de conexão com o backend em ${url}: ${(err as Error).message || "Serviço inacessível"}`
    );
  }

  if (!response.ok) {
    let errorDetails: unknown = null;
    try {
      errorDetails = await response.json();
    } catch {
      // Falha ao parsear json de erro
    }
    const message =
      (errorDetails as { detail?: string; message?: string })?.detail ||
      (errorDetails as { detail?: string; message?: string })?.message ||
      `Erro na requisição HTTP: ${response.status} ${response.statusText}`;

    throw new ApiError(response.status, message, errorDetails);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Tela 1: Painel Executivo
  getKPIs: (): Promise<DashboardKPIs> => request<DashboardKPIs>("/dashboard/kpis"),
  
  getPersonas: (): Promise<PersonaData[]> =>
    request<PersonaData[]>("/dashboard/personas"),
    
  getPareto: (): Promise<ParetoData[]> =>
    request<ParetoData[]>("/dashboard/pareto"),

  // Tela 2: Central de Decisões
  getMomentos: (): Promise<Momento[]> => request<Momento[]>("/momentos"),
  
  simularMotor: (payload: SimularPayload): Promise<SimularResponse> =>
    request<SimularResponse>("/motor/simular", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Tela 3: Auditoria e Explicabilidade
  getAuditoriaDecisoes: (): Promise<DecisaoAuditoria[]> =>
    request<DecisaoAuditoria[]>("/auditoria/decisoes"),

  getDecisaoShap: (decisaoId: string): Promise<ShapResponse> =>
    request<ShapResponse>(`/auditoria/decisoes/${encodeURIComponent(decisaoId)}/shap`),
};
