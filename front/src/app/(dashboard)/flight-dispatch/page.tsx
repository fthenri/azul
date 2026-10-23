import { CrewView } from "@/features/crew-view/components/crew-view";

export const metadata = {
  title: "Despacho de Voo (Mapa) | Azul Retenção de Alto Valor",
  description:
    "Visão de Despacho de Voo e Mapa de Cabine com recomendações táticas de CRM de bordo em tempo real.",
};

export default function FlightDispatchPage() {
  return <CrewView />;
}

