export interface PulsoTourStepDef {
  id: string;
  route: string;
  element: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const MASTER_TOUR_STEPS: PulsoTourStepDef[] = [
  {
    id: "sidebar-brand",
    route: "/dashboard",
    element: '[data-tour="sidebar-brand"]',
    title: "Bem-vindo ao pulso",
    description:
      "Motor preditivo de retenção de clientes de alto valor da Azul Linhas Aéreas. Combina 3 Cérebros de IA, Árbitro Matemático de Uplift e conexão em tempo real com a tripulação.",
    side: "right",
    align: "start",
  },
  {
    id: "executive-kpis",
    route: "/dashboard",
    element: '[data-tour="executive-kpis"]',
    title: "Cockpit Executivo & ROI",
    description:
      "Acompanhe o CLV Total Protegido, Risco Médio da Carteira e o retorno financeiro líquido alcançado por real investido.",
    side: "bottom",
    align: "start",
  },
  {
    id: "pareto-chart",
    route: "/dashboard",
    element: '[data-tour="pareto-chart"]',
    title: "Cérebro 1 — Concentração de Valor",
    description:
      "Regra de Pareto (80/20): mais de 80% da receita da companhia concentra-se nos 20% mais valiosos (Tiers Diamante e Safira).",
    side: "top",
    align: "center",
  },
  {
    id: "personas-chart",
    route: "/dashboard",
    element: '[data-tour="personas-chart"]',
    title: "Cérebro 3 — Personas K-Means",
    description:
      "Segmentação comportamental que agrupa passageiros por frequência, perfil de viagem e histórico de sensibilidade a atritos.",
    side: "top",
    align: "center",
  },
  {
    id: "nav-simulator",
    route: "/dashboard",
    element: '[data-tour="nav-simulator"]',
    title: "Central de Decisões",
    description:
      "Onde a IA opera: clique em 'Próximo' para acessar o Cérebro 2 (Risco XGBoost) e o Árbitro de Uplift.",
    side: "right",
    align: "center",
  },
  {
    id: "moments-queue",
    route: "/simulator",
    element: '[data-tour="moments-queue"]',
    title: "Cérebro 2 — Radar de Atritos",
    description:
      "Fila viva de passageiros que sofreram atritos recentes (atrasos críticos, extravios), priorizados por probabilidade de churn.",
    side: "bottom",
    align: "start",
  },
  {
    id: "moments-first-card",
    route: "/simulator",
    element: '[data-tour="moments-first-card"]',
    title: "Árbitro de Uplift & RAG",
    description:
      "O sistema só aprova retenções com retorno positivo: (CLV Preservado - Custo) > 0. O Agente LLM redige orientações sem alucinações.",
    side: "bottom",
    align: "start",
  },
  {
    id: "nav-dispatch",
    route: "/simulator",
    element: '[data-tour="nav-dispatch"]',
    title: "Despacho para a Cabine",
    description:
      "As decisões conectam a Torre diretamente ao voo: clique em 'Próximo' para abrir o Mapa de Assentos em tempo real.",
    side: "right",
    align: "center",
  },
  {
    id: "seat-map",
    route: "/dashboard/dispatch",
    element: '[data-tour="seat-map"]',
    title: "Mapa de Assentos & CrewApp",
    description:
      "Localização exata dos passageiros afetados na aeronave. Os comissários recebem missões em tempo real no app de bordo (/crew).",
    side: "top",
    align: "center",
  },
  {
    id: "nav-audit",
    route: "/dashboard/dispatch",
    element: '[data-tour="nav-audit"]',
    title: "Trilha de Auditoria & Compliance",
    description:
      "Transparência total: clique em 'Próximo' para auditar o histórico de decisões e a explicabilidade matemática das intervenções.",
    side: "right",
    align: "center",
  },
  {
    id: "audit-table",
    route: "/audit-logs",
    element: '[data-tour="audit-table"]',
    title: "Explicabilidade Matemática SHAP",
    description:
      "Em conformidade com a ANAC Res. 400 e LGPD Art. 20: cada ação é registrada com valores SHAP do XGBoost. Você concluiu o Tour Master do pulso!",
    side: "top",
    align: "center",
  },
];
