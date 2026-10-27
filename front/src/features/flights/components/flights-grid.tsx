"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  AlertTriangle,
  Crown,
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  Clock,
  Compass,
  ShieldCheck,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_MALHA_VOOS } from "@/lib/demo-data";
import { ListaVoosResponse, VooMalhaResumo } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function FlightsGrid() {
  const { isDemoMode } = useDemoMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"todos" | "criticos" | "vips">("todos");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ListaVoosResponse, Error>({
    queryKey: ["scheduled-flights", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_MALHA_VOOS;
      }
      return api.getFlights(50);
    },
    staleTime: 1000 * 30, // 30 segundos
  });

  const flights = useMemo(() => data?.voos || [], [data?.voos]);

  // Métricas agregadas de cabeçalho
  const metrics = useMemo(() => {
    let totalPax = 0;
    let totalCriticos = 0;
    let totalVips = 0;
    let totalPnrs = 0;

    flights.forEach((f) => {
      totalPax += f.total_passageiros;
      totalCriticos += f.passageiros_criticos;
      totalVips += f.passageiros_vip;
      totalPnrs += f.total_pnrs;
    });

    return {
      totalVoos: flights.length,
      totalPax,
      totalCriticos,
      totalVips,
      totalPnrs,
    };
  }, [flights]);

  // Filtragem e busca
  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      const matchSearch =
        f.numero_voo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.origem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.rota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.includes(searchTerm);

      if (!matchSearch) return false;

      if (selectedFilter === "criticos") {
        return f.passageiros_criticos > 0;
      }
      if (selectedFilter === "vips") {
        return f.passageiros_vip > 0;
      }

      return true;
    });
  }, [flights, searchTerm, selectedFilter]);

  return (
    <div className="space-y-6">
      {/* Header com Título e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Malha Aérea Comercial
            </h1>
            <Badge variant="outline" className="bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] border-[#0077C8]/20">
              DuckDB Real
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selecione um voo programado para inspecionar mapa de assentos, agrupamento por PNR e despacho em lote.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            <span>Atualizar Malha</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Voos na Malha
              </span>
              <Plane className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {metrics.totalVoos}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Rotas comerciais ativas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Passageiros Monitorados
              </span>
              <Users className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {metrics.totalPax.toLocaleString("pt-BR")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Distribuídos em {metrics.totalPnrs} reservas (PNR)
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">
                Risco Crítico (Evasão)
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">
              {metrics.totalCriticos}
            </div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Score de atrito elevado / Churn &gt; 60%
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 uppercase">
                Clientes Alto Valor (Tiers)
              </span>
              <Crown className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-950 dark:text-indigo-200">
              {metrics.totalVips}
            </div>
            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-400 mt-0.5">
              Diamante & Safira (Top Pareto)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border-border">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar voo, rota (ex: 6002, SBSP, SBFI)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0077C8]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Filtrar:</span>
            <Button
              variant={selectedFilter === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("todos")}
              className={cn("text-xs h-8", selectedFilter === "todos" && "bg-[#0077C8] hover:bg-[#005a99]")}
            >
              Todos ({flights.length})
            </Button>
            <Button
              variant={selectedFilter === "criticos" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("criticos")}
              className={cn("text-xs h-8", selectedFilter === "criticos" && "bg-rose-600 hover:bg-rose-700 text-white")}
            >
              Com Críticos ({flights.filter((f) => f.passageiros_criticos > 0).length})
            </Button>
            <Button
              variant={selectedFilter === "vips" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("vips")}
              className={cn("text-xs h-8", selectedFilter === "vips" && "bg-indigo-900 hover:bg-indigo-950 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:text-white")}
            >
              Diamante / Safira ({flights.filter((f) => f.passageiros_vip > 0).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Voos */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="font-bold text-xs">Voo</TableHead>
                <TableHead className="font-bold text-xs">Rota</TableHead>
                <TableHead className="font-bold text-xs">Partida Prevista</TableHead>
                <TableHead className="font-bold text-xs">Ocupação</TableHead>
                <TableHead className="font-bold text-xs text-center">Críticos</TableHead>
                <TableHead className="font-bold text-xs text-center">Diamante / Safira</TableHead>
                <TableHead className="font-bold text-xs">Atraso Médio</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#0077C8]" />
                      <span className="text-xs">Carregando malha aérea do DuckDB...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-rose-600">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-xs font-semibold">
                        Erro ao carregar malha aérea: {error?.message}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs mt-2">
                        Tentar Novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center text-muted-foreground text-xs">
                    Nenhum voo encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlights.map((flight) => (
                  <TableRow key={flight.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-bold text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                          <Plane className="h-3.5 w-3.5" />
                        </div>
                        <span>{flight.numero_voo}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{flight.rota}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {flight.origem} para {flight.destino}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 opacity-60" />
                        <span>{flight.partida_prevista.replace("T", " ")}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">
                        {flight.total_passageiros} passageiros
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3 opacity-60" />
                        <span>{flight.total_pnrs} PNRs (localizadores)</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {flight.passageiros_criticos > 0 ? (
                        <Badge
                          variant="destructive"
                          className="font-mono font-bold text-[11px] px-2 py-0.5"
                        >
                          {flight.passageiros_criticos}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-50">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {flight.passageiros_vip > 0 ? (
                        <Badge
                          className="bg-indigo-900 hover:bg-indigo-950 text-white dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200 border font-mono font-bold text-[11px] px-2 py-0.5"
                        >
                          {flight.passageiros_vip}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-50">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {flight.atraso_medio_minutos >= 5 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          +{Math.round(flight.atraso_medio_minutos)} min
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Pontual
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider",
                          flight.status_operacional === "A EMBARCAR"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            : flight.status_operacional === "PROGRAMADO"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {flight.status_operacional}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Link href={`/dashboard/flights/${flight.id}`}>
                        <Button
                          size="sm"
                          className="text-xs h-8 gap-1.5 bg-[#0077C8] hover:bg-[#005a99] text-white font-bold cursor-pointer"
                        >
                          <span>Analisar Voo</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

