"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { getDefaultPath } from "@/config/rbac";

export default function Home() {
  const router = useRouter();
  const { user, isAuth, hydrate } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      if (isAuth && user) {
        router.replace(getDefaultPath(user.role));
      } else {
        router.replace("/login");
      }
    }
  }, [hydrated, isAuth, user, router]);

  return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full gradient-primary animate-pulse-glow" /></div>;
}
