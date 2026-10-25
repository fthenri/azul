---
name: enterprise-login-ui
description: Design and develop modern, premium corporate login and authentication screens in dark mode. Covers deep navy palettes, vibrant light blue accents, frosted glassmorphism (liquid glass), high-contrast accessibility, enterprise SSO, quick demo credentials, and Tailwind CSS production patterns. Use when building login pages, authentication portals, or enterprise access screens.
metadata:
  model: inherit
---

# Enterprise Login UI Design System (Dark Mode & Aero-Navy Glassmorphism)

Guia completo e padronização visual para criação de telas de autenticação e portais de login corporativos modernos, refinados e de alto valor empresarial.

---

## Use esta skill quando

- Desenvolver ou refatorar telas de login, portais de autenticação ou sign-in corporativo.
- Projetar interfaces enterprise em **Dark Mode** com paleta **Deep Navy** e acentos em **Azul Celeste Vibrante**.
- Aplicar técnicas de **Glassmorphism corporativo (Liquid Glass)** com desfoque de fundo, bordas translúcidas e sombras suaves multicamadas.
- Estruturar formulários de alta usabilidade com validação, acessibilidade (WCAG AA), controle de visibilidade de senha e feedback contextual.
- Integrar autenticação federada corporativa (**SSO / Microsoft Azure AD / Okta**) e seletores de perfis de demonstração (1-Clique Demo).
- Criar prompts precisos para geradores de interface (v0.dev, Cursor, Antigravity, etc.).

## Não use esta skill quando

- O objetivo for uma tela de login minimalista monocromática clara (Light Theme padrão neutro).
- O projeto exigir uma identidade visual externa incompatível com azul-marinho profundo e estética corporativa high-tech.
- A interface for focada estritamente em landing pages públicas de varejo/e-commerce voltadas ao consumidor final B2C.

---

## 1. Princípios de Design & Identidade Visual

### 1.1 Clareza e Hierarquia Visual (Clarity & Visual Hierarchy)
- **Foco Central Desobstrutivo**: Um único card de login posicionado no centro visual da viewport, evitando múltiplos painéis concorrentes que causem dispersão.
- **Hierarquia Tipográfica Nítida**:
  1. *Identidade & Sistema*: Logotipo corporativo oficial + micro-badge de ecossistema (`Ecossistema Azul Fidelidade • Enterprise`).
  2. *Título do Produto*: Nome limpo e proeminente do sistema (`Azul - Motor de Retenção`).
  3. *Subtítulo Funcional*: Proposta de valor curta e legível em tom secundário (`slate-400`).
  4. *Rótulos de Campos*: Micro-rótulos em caixa alta com kerning expandido (`text-[11px] font-bold uppercase tracking-wider`).
  5. *Ação Primária Proeminente*: Botão largo, arredondado e luminoso que domina a parte inferior do formulário.

### 1.2 Paleta Deep Navy & Vibrancy (Dark Mode High-End)
Evite pretos absolutos (`#000000`) chapados para evitar fadiga ocular e artefatos de contraste severo. Utilize azul-marinho noturno com camadas de gradientes atmosféricos:

| Elemento / Token | Código Hex / HSL | Tailwind Equivalente | Função Visual |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#030712` | `bg-[#030712]` | Fundo base midnight |
| **Navy Gradient Mid** | `#071120` | `bg-[#071120]` | Transição de profundidade |
| **Card Surface** | `#071120` @ 80% opacity | `bg-[#071120]/80` | Superfície de vidro fosco |
| **Input Background** | `#040915` @ 85% opacity | `bg-[#040915]/85` | Recesso de alto contraste para digitação |
| **Primary Accent** | `#00A3FF` / `#0A84FF` | `text-sky-400`, `bg-[#00A3FF]` | Cor de ação, foco e destaque |
| **Secondary Navy** | `#003B7A` / `#002855` | `from-[#002855]` | Gradiente clássico institucional Azul |
| **Text Primary** | `#FFFFFF` / `#F8FAFC` | `text-white` | Legibilidade máxima em rótulos e digitação |
| **Text Muted** | `#94A3B8` | `text-slate-400` | Subtítulos, hints e metadados |
| **Borders & Dividers** | `rgba(255, 255, 255, 0.08)` | `border-white/10`, `border-slate-800/80` | Delimitação ultrafina de materiais |

---

## 2. Anatomia do Glassmorphism Corporativo (Liquid Glass)

O efeito de vidro fosco para ambientes enterprise deve ser sofisticado, evitando borrões pesados ou opacidades que prejudiquem a legibilidade:

```
┌────────────────────────────────────────────────────────────────────────┐
│  GLOW EXTERNO: radial-gradient(from sky-400/25 to transparent, blur-2xl)│
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ FEIXE SUPERIOR: 1.5px h bg-gradient-to-r(via-sky-400/90)         │  │
│  │ BORDA FINA: 1px border-white/10                                  │  │
│  │ SUPERFÍCIE: bg-[#071120]/80 + backdrop-blur-2xl                  │  │
│  │                                                                  │  │
│  │   [ Sparkles Badge ] Ecossistema Azul Fidelidade                 │  │
│  │   Azul - Motor de Retenção                                       │  │
│  │   Autenticação corporativa de alto padrão...                     │  │
│  │                                                                  │  │
│  │   ┌── INPUT CONTAINER ───────────────────────────────────────┐   │  │
│  │   │ [Mail Icon]  nome.sobrenome@azul.com.br                  │   │  │
│  │   └──────────────────────────────────────────────────────────┘   │  │
│  │   ┌── INPUT CONTAINER ───────────────────────────────────────┐   │  │
│  │   │ [Lock Icon]  ••••••••••••                [Eye/EyeOff]   │   │  │
│  │   └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │   [✓] Lembrar meu acesso                Esqueceu a senha?        │  │
│  │                                                                  │  │
│  │   ███████████████ ENTRAR NO SISTEMA ➜ ███████████████████████    │  │
│  │                                                                  │  │
│  │   ─────────────── OU AUTENTICAÇÃO FEDERADA ───────────────       │  │
│  │   [ Building Icon ] Acessar via Microsoft Azure AD / SSO         │  │
│  │                                                                  │  │
│  │   ── ACESSO RÁPIDO DE DEMONSTRAÇÃO (1-CLIQUE) ────────────       │  │
│  │   [ Gestor CRM ]                     [ Chefe de Cabine ]         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Regras do Vidro:
1. **Desfoque Eficaz**: Utilize `backdrop-blur-2xl` ou `backdrop-blur-3xl`.
2. **Top Specular Highlight**: Uma linha horizontal de 1px a 1.5px no topo do card (`absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/90 to-transparent`) para simular reflexão de iluminação superior.
3. **Halo Perimetral**: Uma `div` absoluta atrás do card com `-inset-1.5` ou `-inset-2`, desfoque `blur-2xl` e opacidade suave para destacar o card do fundo sem sobrecarregar.

---

## 3. Padrões de Componentes e Formulário

### 3.1 Campos de Entrada (High-Contrast Input Fields)
- **Estrutura**:
  ```tsx
  <div className="space-y-1.5">
    <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
      Corporate E-mail
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
        <Mail className="h-4 w-4" />
      </div>
      <input
        id="email"
        type="email"
        required
        placeholder="colaborador@azul.com.br"
        className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-700/80 bg-[#040915]/85 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 focus:bg-[#060e20] transition-all duration-200 shadow-inner"
      />
    </div>
  </div>
  ```
- **Visibilidade de Senha**: Inclua sempre alternador [`Eye`](file:///c:/Users/ricardo/Documents/projects_on_gh/azul/front/src/app/login/page.tsx#L20) / [`EyeOff`](file:///c:/Users/ricardo/Documents/projects_on_gh/azul/front/src/app/login/page.tsx#L21) posicionado na extrema direita interna do input com `aria-label` acessível.

### 3.2 Botão Primário Arredondado ('Entrar no Sistema')
- **Características**:
  - Altura confortável de 48px (`h-12`).
  - Cantos arredondados expressivos (`rounded-xl` ou `rounded-2xl`).
  - Gradiente em azul celeste vibrante: `bg-gradient-to-r from-[#00A3FF] via-[#0284C7] to-[#0077C8]`.
  - Sombra com glow azul: `shadow-[0_4px_22px_rgba(0,163,255,0.4)] hover:shadow-[0_6px_32px_rgba(0,163,255,0.65)]`.
  - Micro-interação: No hover, o ícone de seta desliza suavemente para a direita (`group-hover:translate-x-1 transition-transform`).
  - Estado de carregamento com spinner circular SVG e texto "Autenticando...".

### 3.3 Acesso Rápido de Demonstração (Demo Profiles)
Em sistemas de avaliação, bancas examinadoras e ambientes de homologação corporativa, botões de preenchimento em 1-clique elevam drasticamente a experiência do usuário:
- Dois cards compactos organizados em grid (`grid-cols-2 gap-2.5`).
- Estado selecionado evidenciado por borda azul celeste (`border-sky-400 bg-sky-500/15`) e ícone de check.
- Preenchimento simultâneo de e-mail e senha correspondentes ao RBAC do backend (`manager` vs `commissioner`).

---

## 4. Código de Referência Completo (Next.js + Tailwind)

Abaixo encontra-se o template modular e pronto para uso:

```tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, Building2, CheckCircle2, Sparkles, Plane, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EnterpriseLoginCard({ onLoginSuccess }: { onLoginSuccess: (email: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoSelected, setDemoSelected] = useState<"manager" | "commissioner" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Informe o e-mail corporativo e a senha.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // Simulação ou chamada real à API
      await new Promise((resolve) => setTimeout(resolve, 800));
      onLoginSuccess(email, demoSelected || "manager");
    } catch {
      setErrorMessage("Credenciais inválidas. Verifique seu login.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (role: "manager" | "commissioner") => {
    setDemoSelected(role);
    setErrorMessage(null);
    if (role === "manager") {
      setEmail("gestor@azul.com.br");
      setPassword("azul1234");
    } else {
      setEmail("comissario@azul.com.br");
      setPassword("azul1234");
    }
  };

  return (
    <div className="relative w-full max-w-[470px]">
      {/* Halo de Brilho Perimetral */}
      <div className="absolute -inset-1.5 rounded-[2.3rem] bg-gradient-to-b from-sky-400/25 via-blue-600/15 to-transparent blur-2xl opacity-75 -z-10" />

      {/* Card Glassmorphic */}
      <div className="relative rounded-[2.2rem] border border-white/10 bg-[#071120]/80 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(56,189,248,0.07)] overflow-hidden">
        {/* Linha de Destaque Superior */}
        <div className="absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/90 to-transparent" />

        {/* Header do Card */}
        <div className="text-center space-y-3 mb-7">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 text-[11px] font-semibold tracking-wide shadow-inner">
            <Sparkles className="h-3 w-3 text-sky-400" />
            <span>Ecossistema Azul Fidelidade</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-[27px] font-black tracking-tight text-white">
              Azul - Motor de Retenção
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-400 mt-1.5 font-normal leading-relaxed">
              Acesso corporativo exclusivo para inteligência de retenção e operações de alto valor.
            </p>
          </div>
        </div>

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Corporate E-mail
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-4 h-4 w-4 text-slate-400 group-focus-within:text-sky-400 transition-colors pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@azul.com.br"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-700/80 bg-[#040915]/85 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 focus:bg-[#060e20] transition-all duration-200 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline transition-colors"
                onClick={() => setErrorMessage("Contate o Service Desk TI Azul.")}
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-4 h-4 w-4 text-slate-400 group-focus-within:text-sky-400 transition-colors pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-700/80 bg-[#040915]/85 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 focus:bg-[#060e20] transition-all duration-200 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400/30 accent-[#00A3FF]"
              />
              <span className="text-xs text-slate-300">Lembrar meu acesso neste dispositivo</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#00A3FF] via-[#0284C7] to-[#0077C8] hover:from-[#38BDF8] hover:via-[#0ea5e9] text-white font-bold text-sm tracking-wide shadow-[0_4px_22px_rgba(0,163,255,0.4)] hover:shadow-[0_6px_32px_rgba(0,163,255,0.65)] active:scale-[0.99] transition-all duration-200 border-0 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? "Autenticando..." : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Divisor */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#071120] px-3 text-slate-500 font-semibold tracking-wider">
              ou autenticação federada
            </span>
          </div>
        </div>

        {/* SSO Button */}
        <button
          type="button"
          className="w-full h-11 rounded-xl border border-slate-700/70 bg-white/[0.03] hover:bg-white/[0.07] text-xs text-slate-300 font-medium transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <Building2 className="h-4 w-4 text-sky-400" />
          <span>Acessar via Microsoft Azure AD / SSO</span>
        </button>

        {/* Seletor Rápido de Demo */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Plane className="h-3 w-3 text-sky-400" />
              Acesso Rápido de Demonstração
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/20">
              1-Clique
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleDemoFill("manager")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                demoSelected === "manager"
                  ? "border-sky-400 bg-sky-500/15 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                  : "border-slate-800 bg-[#040915]/60 hover:bg-slate-800/40 text-slate-300"
              }`}
            >
              <div className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>Gestor CRM</span>
                {demoSelected === "manager" ? <CheckCircle2 className="h-3 w-3 text-sky-400" /> : <ChevronRight className="h-3 w-3 text-slate-600" />}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">Cockpit Executivo</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill("commissioner")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                demoSelected === "commissioner"
                  ? "border-sky-400 bg-sky-500/15 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                  : "border-slate-800 bg-[#040915]/60 hover:bg-slate-800/40 text-slate-300"
              }`}
            >
              <div className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>Chefe de Cabine</span>
                {demoSelected === "commissioner" ? <CheckCircle2 className="h-3 w-3 text-sky-400" /> : <ChevronRight className="h-3 w-3 text-slate-600" />}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">Visão de Bordo</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Checklist de Avaliação e Boas Práticas

- [ ] **Contraste de Acessibilidade (WCAG 2.1 AA)**: Texto branco `#FFFFFF` sobre recesso `#040915` atinge contraste superior a `15:1`.
- [ ] **Desfoque de Camadas Sem Quebra de Renderização**: Uso de `backdrop-blur-2xl` em conjunto com cor semitransparente (`bg-[#071120]/80`).
- [ ] **Resolução de Tela e Responsividade**: Testado em Mobile (390px) e Desktop (1920px), com margens confortáveis e sem overflow horizontal.
- [ ] **Automação de Credenciais para Apresentação**: Presença do seletor de contas demonstrativas pré-populadas evitando atrito em reuniões com stakeholders.
- [ ] **Feedback Imediato de Ações**: Tratamento explícito de estado de loading com desativação do botão e mensagens de erro visíveis e descritivas.

---

## 6. Prompt Modelo para Geradores de UI (v0.dev / Antigravity / Claude)

Copie e cole o prompt estruturado abaixo quando desejar replicar este padrão em novos portais ou ferramentas:

> *"Create a high-end enterprise corporate login screen UI for an analytics platform named 'Azul - Motor de Retenção'. Dark mode theme with deep navy blues (#030712, #071120, #002855) and vibrant electric cyan/sky-blue accent (#00A3FF). Centered sleek glassmorphism card (backdrop-blur-2xl, bg-[#071120]/80, subtle white/10 border, luminous top highlight beam, and soft outer ambient cyan glow). Include high-contrast inputs for 'Corporate E-mail' and 'Password' with icons, visibility toggle, and dark recessed surfaces (#040915). Add a prominent, rounded 'Entrar no Sistema' button with vibrant blue gradient and arrow micro-interaction. Include a federated SSO button for Microsoft Azure AD and a 1-click quick demo profile selector for 'Gestor CRM' and 'Chefe de Cabine'. Minimalist top navbar with live system operational status badge and corporate security compliance footer."*
