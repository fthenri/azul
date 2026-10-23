"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    // Encaminha para o subpath de login adequado com base no redirect pretendido
    if (redirect?.startsWith("/crew")) {
      router.replace(`/login/commissioner?redirect=${encodeURIComponent(redirect)}`);
    } else if (redirect) {
      router.replace(`/login/manager?redirect=${encodeURIComponent(redirect)}`);
    } else {
      router.replace("/");
    }
  }, [redirect, router]);

  return (
    <div className="min-h-screen bg-[#001733] flex items-center justify-center text-white text-xs">
      <span>Redirecionando para seleção de perfil...</span>
    </div>
  );
}
