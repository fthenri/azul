import React from "react";
import { ShieldCheck, TrendingUp, DollarSign, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { DashboardKPIs } from "@/types/api";
import { formatCurrency, formatRatio } from "@/lib/formatters";

interface KpiCardsProps {
  data?: DashboardKPIs;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 bg-card border-border shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      title: "Valor Protegido",
      value: formatCurrency(data.valor_protegido),
      description: "CLV de clientes preservado pelo motor",
      icon: ShieldCheck,
      color: "text-[#16805D]",
      bg: "bg-[#16805D]/10",
      border: "border-[#16805D]/20",
      tooltip: "CLV (Customer Lifetime Value): Previsão de lucro futuro gerado pelo cliente com base no histórico de engajamento e decaimento.",
    },
    {
      title: "Valor Gerado",
      value: formatCurrency(data.valor_gerado),
      description: "Receita adicional e compras de auxiliares",
      icon: TrendingUp,
      color: "text-[#0077C8]",
      bg: "bg-[#0077C8]/10",
      border: "border-[#0077C8]/20",
    },
    {
      title: "Custo Total",
      value: formatCurrency(data.custo_total),
      description: "Ações concedidas e vouchers aplicados",
      icon: DollarSign,
      color: "text-[#B96B08]",
      bg: "bg-[#B96B08]/10",
      border: "border-[#B96B08]/20",
    },
    {
      title: "ROI por Real Gasto",
      value: formatRatio(data.roi_por_real_gasto),
      description: "Retorno líquido por R$ 1 investido",
      icon: Award,
      color: "text-[#003B7A]",
      bg: "bg-[#EAF4FC]",
      border: "border-[#0077C8]/30",
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.title}
            className={`overflow-hidden border ${kpi.border} bg-card text-card-foreground shadow-xs hover:shadow-sm transition-all`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                  {kpi.title}
                  {kpi.tooltip && <InfoTooltip text={kpi.tooltip} side="bottom" />}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {kpi.value}
                </span>
                {kpi.highlight && (
                  <Badge className="bg-[#16805D] text-white text-[10px] px-1.5 py-0">
                    Alta Eficiência
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
