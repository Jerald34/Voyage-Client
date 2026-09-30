import { redirect } from "next/navigation";

export default function AgencyAgentPage() {
  redirect("/?authenticated=1");
  return null;
}
