"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Agency settings live in the dashboard's Agency tab now. Staff who follow this
// link fall back to Settings there (see resolveVisibleTab).
export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?authenticated=1&tab=agency");
  }, [router]);

  return null;
}
