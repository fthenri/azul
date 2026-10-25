import {
  DashboardKPIs,
  PersonaData,
  ParetoData,
  Momento,
  SimularPayload,
  SimularResponse,
  DecisaoAuditoria,
  ShapResponse,
  AssentoVoo,
  VooSimuladoResponse,
  ListaVoosResponse,
  VooDetalheResponse,
  SimularBordoPayload,
  SimularBordoResponse,
  LoginPayload,
  TokenResponse,
  UserOut,
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

  // Injeção automática do Bearer token caso disponível no storage do navegador
  const token = typeof window !== "undefined" ? localStorage.getItem("azul_access_token") : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
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

    // Em caso de 401 Unauthorized em rota privada, limpa o token
    if (response.status === 401 && typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("azul_access_token");
        localStorage.removeItem("azul_auth_user");
        document.cookie = "azul_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
        document.cookie = "azul_user_role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
      }
    }

    throw new ApiError(response.status, message, errorDetails);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Autenticação & Perfil
  login: (payload: LoginPayload): Promise<TokenResponse> =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: (): Promise<UserOut> => request<UserOut>("/auth/me"),

  getDemoUsers: (): Promise<UserOut[]> => request<UserOut[]>("/auth/users"),

  // Tela 1: Painel Executivo (Manager)
  getKPIs: (): Promise<DashboardKPIs> => request<DashboardKPIs>("/dashboard/kpis"),
  
  getPersonas: (): Promise<PersonaData[]> =>
    request<PersonaData[]>("/dashboard/personas"),
    
  getPareto: (): Promise<ParetoData[]> =>
    request<ParetoData[]>("/dashboard/pareto"),

  // Tela 2: Central de Decisões (Manager)
  getMomentos: (): Promise<Momento[]> => request<Momento[]>("/momentos"),
  
  simularMotor: (payload: SimularPayload): Promise<SimularResponse> =>
    request<SimularResponse>("/motor/simular", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Tela 3: Auditoria e Explicabilidade (Manager)
  getAuditoriaDecisoes: (): Promise<DecisaoAuditoria[]> =>
    request<DecisaoAuditoria[]>("/auditoria/decisoes"),

  getDecisaoShap: (decisaoId: string): Promise<ShapResponse> =>
    request<ShapResponse>(`/auditoria/decisoes/${encodeURIComponent(decisaoId)}/shap`),

  // Tela 4: Visão da Tripulação & Malha Aérea (Commissioner & Manager)
  getFlights: (limit: number = 50): Promise<ListaVoosResponse> =>
    request<ListaVoosResponse>(`/flights?limit=${limit}`),

  getFlightById: (flightId: string): Promise<VooDetalheResponse> =>
    request<VooDetalheResponse>(`/flights/${encodeURIComponent(flightId)}`),

  getVooSimulado: (modelo?: string): Promise<VooSimuladoResponse> =>
    request<VooSimuladoResponse>(`/voo-simulado${modelo ? `?modelo=${encodeURIComponent(modelo)}` : ""}`),

  simularBordo: (payload: SimularBordoPayload): Promise<SimularBordoResponse> =>
    request<SimularBordoResponse>("/motor/simular-bordo", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
