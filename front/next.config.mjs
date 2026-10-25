/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

let finalConfig = nextConfig;

try {
  const withPWAInit = (await import("@ducanh2912/next-pwa")).default;
  const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
    fallbacks: {
      document: "/offline",
    },
    workboxOptions: {
      disableDevLogs: true,
    },
  });
  finalConfig = withPWA(nextConfig);
} catch (error) {
  // Caso a dependência ainda não tenha sido instalada no container Docker
  console.warn("⚠️ [@ducanh2912/next-pwa] Módulo não carregado. Operando com nextConfig padrão:", error.message);
  finalConfig = nextConfig;
}

export default finalConfig;
