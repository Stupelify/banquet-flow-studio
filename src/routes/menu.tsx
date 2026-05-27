import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu — Bika Ops" }, { name: "description", content: "Items, templates, ingredients, vendors." }] }),
  component: MenuPage,
});

const TABS = ["Items", "Templates", "Ingredients", "Vendors"] as const;

const ITEMS = [
  { name: "Paneer Tikka", type: "Starter", veg: true, cost: 95, pts: 2 },
  { name: "Hara Bhara Kebab", type: "Starter", veg: true, cost: 75, pts: 2 },
  { name: "Murgh Tikka", type: "Starter", veg: false, cost: 125, pts: 3 },
  { name: "Dal Makhani", type: "Main", veg: true, cost: 60, pts: 2 },
  { name: "Paneer Butter Masala", type: "Main", veg: true, cost: 110, pts: 3 },
  { name: "Mutton Rogan Josh", type: "Main", veg: false, cost: 240, pts: 5 },
  { name: "Tandoori Roti", type: "Bread", veg: true, cost: 18, pts: 1 },
  { name: "Jeera Rice", type: "Rice", veg: true, cost: 45, pts: 1 },
  { name: "Gulab Jamun", type: "Dessert", veg: true, cost: 35, pts: 1 },
  { name: "Rasmalai", type: "Dessert", veg: true, cost: 55, pts: 2 },
];
const TEMPLATES = [
  { name: "Royal North Indian", cat: "Premium", rate: 1850, setup: 25000, items: 24 },
  { name: "Premium Veg Thali", cat: "Standard", rate: 1250, setup: 18000, items: 18 },
  { name: "Mughlai Special", cat: "Premium", rate: 2100, setup: 28000, items: 26 },
  { name: "South Indian Feast", cat: "Standard", rate: 1100, setup: 16000, items: 16 },
  { name: "Continental Buffet", cat: "Premium", rate: 1950, setup: 30000, items: 22 },
];
const INGREDIENTS = [
  { name: "Paneer", unit: "kg", stock: 45 },
  { name: "Chicken", unit: "kg", stock: 80 },
  { name: "Basmati Rice", unit: "kg", stock: 250 },
  { name: "Atta", unit: "kg", stock: 150 },
  { name: "Tomatoes", unit: "kg", stock: 60 },
];
const VENDORS = [
  { name: "Sharma Provisions", contact: "+91 98200 11111", items: 24, lastOrder: "12/10/24" },
  { name: "Mumbai Fresh", contact: "+91 98200 22222", items: 18, lastOrder: "14/10/24" },
  { name: "Spice Route", contact: "+91 98200 33333", items: 45, lastOrder: "10/10/24" },
];

function MenuPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Items");
  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-hidden flex flex-col">
      <header className="px-3 border-b border-border flex gap-px">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[11px] uppercase tracking-widest mono border-b-2 ${tab === t ? "border-accent" : "border-transparent text-muted hover:text-fg"}`}>{t}</button>
        ))}
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === "Items" && (
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
              <th className="text-left py-1.5 px-3 font-normal">Item</th>
              <th className="text-left py-1.5 font-normal">Type</th>
              <th className="text-left py-1.5 font-normal">Diet</th>
              <th className="text-right py-1.5 font-normal">Cost</th>
              <th className="text-right py-1.5 px-3 font-normal">Pts</th>
            </tr></thead>
            <tbody>{ITEMS.map((i, idx) => (
              <tr key={idx} className="border-b border-border/60 hover:bg-surface-2">
                <td className="py-1.5 px-3 font-medium">{i.name}</td>
                <td className="py-1.5 text-muted">{i.type}</td>
                <td className="py-1.5"><span className="mono text-[9px] uppercase px-1" style={{ color: i.veg ? "var(--confirmed)" : "var(--conflict)", border: `1px solid ${i.veg ? "var(--confirmed)" : "var(--conflict)"}` }}>{i.veg ? "VEG" : "NV"}</span></td>
                <td className="py-1.5 text-right mono">₹ {i.cost}</td>
                <td className="py-1.5 text-right mono px-3">{i.pts}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {tab === "Templates" && (
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
              <th className="text-left py-1.5 px-3 font-normal">Menu</th>
              <th className="text-left py-1.5 font-normal">Category</th>
              <th className="text-right py-1.5 font-normal">Items</th>
              <th className="text-right py-1.5 font-normal">Rate / plate</th>
              <th className="text-right py-1.5 px-3 font-normal">Setup cost</th>
            </tr></thead>
            <tbody>{TEMPLATES.map((t, idx) => (
              <tr key={idx} className="border-b border-border/60 hover:bg-surface-2">
                <td className="py-1.5 px-3 font-medium">{t.name}</td>
                <td className="py-1.5 text-muted">{t.cat}</td>
                <td className="py-1.5 text-right mono">{t.items}</td>
                <td className="py-1.5 text-right mono">₹ {t.rate}</td>
                <td className="py-1.5 text-right mono px-3">₹ {t.setup.toLocaleString("en-IN")}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {tab === "Ingredients" && (
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
              <th className="text-left py-1.5 px-3 font-normal">Ingredient</th>
              <th className="text-left py-1.5 font-normal">Unit</th>
              <th className="text-right py-1.5 px-3 font-normal">In stock</th>
            </tr></thead>
            <tbody>{INGREDIENTS.map((i, idx) => (
              <tr key={idx} className="border-b border-border/60 hover:bg-surface-2">
                <td className="py-1.5 px-3 font-medium">{i.name}</td>
                <td className="py-1.5 text-muted mono">{i.unit}</td>
                <td className="py-1.5 text-right mono px-3">{i.stock}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {tab === "Vendors" && (
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
              <th className="text-left py-1.5 px-3 font-normal">Vendor</th>
              <th className="text-left py-1.5 font-normal">Contact</th>
              <th className="text-right py-1.5 font-normal">Items supplied</th>
              <th className="text-right py-1.5 px-3 font-normal">Last order</th>
            </tr></thead>
            <tbody>{VENDORS.map((v, idx) => (
              <tr key={idx} className="border-b border-border/60 hover:bg-surface-2">
                <td className="py-1.5 px-3 font-medium">{v.name}</td>
                <td className="py-1.5 mono text-muted">{v.contact}</td>
                <td className="py-1.5 text-right mono">{v.items}</td>
                <td className="py-1.5 text-right mono px-3">{v.lastOrder}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
