import { FlightsGrid } from "@/features/flights/components/flights-grid";

export const metadata = {
  title: "Malha Aérea & Despacho de Voos | Azul Retenção de Alto Valor",
  description:
    "Gestão da malha aérea comercial, monitoramento de atrito de clientes e despacho em lote.",
};

export default function DashboardFlightsPage() {
  return <FlightsGrid />;
}

