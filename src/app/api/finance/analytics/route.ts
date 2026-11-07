import { route } from "@/lib/api";
import { detectAnomalies } from "@/lib/anomaly";
import { assetRoi, monthly, projection, receivables, topTenants } from "@/lib/reports";
export const GET = route(["admin", "finance"], async () => {
  const [mon, roi, rec, alerts, tenants] = await Promise.all([monthly(12), assetRoi(), receivables(), detectAnomalies(), topTenants()]);
  const cats = new Map<string, number>(); for (const a of roi) cats.set(a.category, (cats.get(a.category) ?? 0) + a.revenue - a.refund);
  return { monthly: mon, cur: mon[mon.length - 1], prev: mon[mon.length - 2], projection: projection(mon.slice(-6).map((m) => m.recognized)),
    categories: Array.from(cats, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    topAssets: roi.filter((a) => a.revenue > 0).sort((a, b) => b.net - a.net).slice(0, 10), weakAssets: roi.filter((a) => a.cost > 0).sort((a, b) => a.net - b.net).slice(0, 5), tenants, receivables: rec, alerts };
});
