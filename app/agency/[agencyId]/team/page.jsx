"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitedSuffix = searchParams.get("invited") === "1" ? "&invited=1" : "";

  useEffect(() => {
    router.replace(`/?authenticated=1&tab=team${invitedSuffix}`);
  }, [invitedSuffix, router]);

  return null;
}
