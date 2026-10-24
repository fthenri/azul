import { CrewView } from "@/features/crew-view/components/crew-view";

export const metadata = {
  title: "Despacho de Voo (Mapa) | Azul Retenção de Alto Valor",
  description:
    "Simulação em tempo real de assentos e despacho tático de missões para a tripulação de bordo.",
};

export default function DashboardDispatchPage() {
  return <CrewView />;
}

