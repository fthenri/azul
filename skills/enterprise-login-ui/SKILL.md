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

---

## 3. Padrões de Componentes e Formulário

### 3.1 Campos de Entrada (High-Contrast Input Fields)
- Rótulos em caixa alta com kerning espaçado (`text-[11px] font-bold uppercase tracking-wider text-slate-300`).
- Fundo rebaixado com contraste profundo (`bg-[#040915]/85`).
- Anel de foco com brilho ciano (`focus:ring-2 focus:ring-sky-400/25 focus:border-sky-400`).
- Alternador de visibilidade de senha ([`Eye`](file:///c:/Users/ricardo/Documents/projects_on_gh/azul/front/src/app/login/page.tsx#L20) / [`EyeOff`](file:///c:/Users/ricardo/Documents/projects_on_gh/azul/front/src/app/login/page.tsx#L21)).

### 3.2 Botão Primário Arredondado ('Entrar no Sistema')
- Altura ergonômica de 48px (`h-12`).
- Cantos arredondados fluidos (`rounded-xl` ou `rounded-2xl`).
- Gradiente de alto impacto: `bg-gradient-to-r from-[#00A3FF] via-[#0284C7] to-[#0077C8]`.
- Sombra azul projetada: `shadow-[0_4px_22px_rgba(0,163,255,0.4)] hover:shadow-[0_6px_32px_rgba(0,163,255,0.65)]`.
- Feedback no clique com contração elástica sutil (`active:scale-[0.99]`).

### 3.3 Acesso Rápido de Demonstração (1-Clique)
- Grid de 2 colunas com cartões seletores rápidos.
- Indicador visual ativo com contorno ciano luminoso e ícone de validação ([`CheckCircle2`](file:///c:/Users/ricardo/Documents/projects_on_gh/azul/front/src/app/login/page.tsx#L19)).
- População automática e sem atrito dos campos de e-mail e senha correspondentes às permissões de usuário.

---

## 4. Prompt Modelo para Geradores de UI

> *"Create a high-end enterprise corporate login screen UI for an analytics platform named 'Azul - Motor de Retenção'. Dark mode theme with deep navy blues (#030712, #071120, #002855) and vibrant electric cyan/sky-blue accent (#00A3FF). Centered sleek glassmorphism card (backdrop-blur-2xl, bg-[#071120]/80, subtle white/10 border, luminous top highlight beam, and soft outer ambient cyan glow). Include high-contrast inputs for 'Corporate E-mail' and 'Password' with icons, visibility toggle, and dark recessed surfaces (#040915). Add a prominent, rounded 'Entrar no Sistema' button with vibrant blue gradient and arrow micro-interaction. Include a federated SSO button for Microsoft Azure AD and a 1-click quick demo profile selector for 'Gestor CRM' and 'Chefe de Cabine'. Minimalist top navbar with live system operational status badge and corporate security compliance footer."*
