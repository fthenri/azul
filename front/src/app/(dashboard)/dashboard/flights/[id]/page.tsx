import { FlightDetailView } from "@/features/flights/components/flight-detail-view";

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: "Painel do Voo e Despacho em Lote | Azul Retenção de Alto Valor",
  description:
    "Mapa de assentos, alocação inteligente por PNR e aprovação em lote de ações táticas para a cabine.",
};

export default function DashboardFlightDetailPage({ params }: PageProps) {
  return <FlightDetailView flightId={params.id} />;
}

