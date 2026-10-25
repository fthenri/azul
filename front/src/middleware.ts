import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("azul_auth_token")?.value;
  const role = request.cookies.get("azul_user_role")?.value;

  // Rotas estáticas ou de assets internas do Next.js e página offline de contingência
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/offline") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Raiz (/): Redireciona diretamente para o portal do perfil autenticado ou para /login
  if (pathname === "/") {
    if (token) {
      if (role === "commissioner") {
        return NextResponse.redirect(new URL("/crew", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Tela de Login (/login): Se já estiver autenticado, pula o login e abre a home do perfil
  if (pathname === "/login") {
    if (token) {
      if (role === "commissioner") {
        return NextResponse.redirect(new URL("/crew", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Rotas restritas ao Gestor (Manager)
  const isManagerRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/executive") ||
    pathname.startsWith("/simulator") ||
    pathname.startsWith("/audit-logs");

  if (isManagerRoute) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role === "commissioner") {
      // Comissário tentando acessar cockpit executivo é direcionado à sua área de bordo
      return NextResponse.redirect(new URL("/crew", request.url));
    }
  }

  // Rotas restritas de Tripulação (Crew / Guest Service Tool)
  const isCrewRoute = pathname.startsWith("/crew");
  if (isCrewRoute) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
