import { route } from "@/lib/api";
import { audit } from "@/lib/audit";
import { reconcileGateway } from "@/lib/payments";
export const POST = route(["admin", "finance"], async (s) => { const r = await reconcileGateway(); await audit({ id: s!.id, name: s!.name }, "gateway_reconcile", "payment", JSON.stringify(r)); return r; });
