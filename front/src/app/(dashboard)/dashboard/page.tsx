import { ExecutiveView } from "@/features/executive-dashboard/components/executive-view";

export const metadata = {
  title: "Portal do Gestor (CRM & Analytics) | Azul Retenção de Alto Valor",
  description:
    "Painel executivo com KPIs de valor protegido, gerado, custo total e ROI por real gasto.",
};

export default function DashboardPortalPage() {
  return <ExecutiveView />;
}

