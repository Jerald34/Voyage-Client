import { redirect } from "next/navigation";

export default function AgencyTripAgentPage() {
  redirect("/?authenticated=1");
  return null;
}
