import React from "react";
import { ShieldCheck, TrendingUp, DollarSign, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-full" />
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
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-100 dark:border-emerald-900/40",
    },
    {
      title: "Valor Gerado",
      value: formatCurrency(data.valor_gerado),
      description: "Receita adicional e compras auxiliares",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-100 dark:border-blue-900/40",
    },
    {
      title: "Custo Total",
      value: formatCurrency(data.custo_total),
      description: "Ações concedidas e vouchers aplicados",
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-100 dark:border-amber-900/40",
    },
    {
      title: "ROI por Real Gasto",
      value: formatRatio(data.roi_por_real_gasto),
      description: "Retorno líquido por R$ 1 investido",
      icon: Award,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      border: "border-purple-100 dark:border-purple-900/40",
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
            className={`overflow-hidden border ${kpi.border} bg-card hover:shadow-md transition-shadow`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.title}
                </span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {kpi.value}
                </span>
                {kpi.highlight && (
                  <Badge variant="success" className="text-[10px]">
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
