import { createFileRoute, useParams, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTenant } from "@/lib/tenant/TenantProvider";

export const Route = createFileRoute("/demo/$tenantSlug")({ ssr: false, component: DemoRedirect });

function DemoRedirect() {
  const { tenantSlug } = useParams({ from: "/demo/$tenantSlug" });
  const { overrideSlug } = useTenant();
  useEffect(() => { overrideSlug(tenantSlug); }, [tenantSlug]);
  return <Navigate to="/" />;
}