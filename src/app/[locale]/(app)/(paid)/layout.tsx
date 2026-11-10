import type { ReactNode } from "react";
import { requirePaidUser } from "@/lib/auth/guards";

export default async function PaidLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  await requirePaidUser((await params).locale);
  return children;
}
