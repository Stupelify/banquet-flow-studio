/**
 * Customer create/edit dialog. Maps to the legacy `Customer` mock shape used
 * by every screen. Validations mirror real client rules (10-digit IN phone,
 * email, GST pattern).
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOpsStore, newId } from "@/lib/api/store";
import type { Customer } from "@/lib/mock/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  phone: z.string().trim().regex(/^\+?[\d\s-]{7,20}$/, "Phone must be 7–20 digits"),
  altPhone: z.string().trim().regex(/^\+?[\d\s-]{7,20}$/).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City required").max(80),
  community: z.string().max(60).optional().or(z.literal("")),
  occupation: z.string().max(80).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  gst: z.string().trim().regex(/^[0-9A-Z]{15}$/, "GST must be 15 alphanumeric chars").optional().or(z.literal("")),
  pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN").optional().or(z.literal("")),
  priority: z.enum(["VIP", "High", "Normal"]),
  rating: z.coerce.number().int().min(0).max(5),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export function CustomerFormDialog({
  open, onOpenChange, customer,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  customer?: Customer | null;
}) {
  const upsertCustomer = useOpsStore((s) => s.upsertCustomer);
  const isNew = !customer;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", phone: "", altPhone: "", email: "", city: "",
      community: "", occupation: "", company: "", gst: "", pan: "",
      priority: "Normal", rating: 0, notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (customer) {
      form.reset({
        name: customer.name, phone: customer.phone, altPhone: customer.altPhone ?? "",
        email: customer.email ?? "", city: customer.city, community: customer.community ?? "",
        occupation: customer.occupation ?? "", company: customer.company ?? "",
        gst: customer.gst ?? "", pan: customer.pan ?? "", priority: customer.priority,
        rating: customer.rating, notes: customer.notes ?? "",
      });
    } else {
      form.reset();
    }
  }, [open, customer, form]);

  const onSubmit = (v: FormValues) => {
    const base: Customer = customer ?? {
      id: newId("CU"),
      name: "", phone: "", email: "", city: "",
      priority: "Normal", rating: 0, visitCount: 0,
      referrals: [],
    };
    const next: Customer = {
      ...base,
      name: v.name, phone: v.phone,
      altPhone: v.altPhone || undefined,
      email: v.email || (base.email ?? ""),
      city: v.city,
      community: v.community || undefined,
      occupation: v.occupation || undefined,
      company: v.company || undefined,
      gst: v.gst || undefined,
      pan: v.pan || undefined,
      priority: v.priority,
      rating: v.rating,
      notes: v.notes || undefined,
    };
    upsertCustomer(next, { isNew });
    onOpenChange(false);
  };

  const errors = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] rounded-none p-0 sm:max-w-4xl sm:h-[85vh] sm:rounded-sm bg-surface border-border flex flex-col gap-0">
        <DialogHeader className="px-3 sm:px-4 py-2.5 border-b border-border shrink-0">
          <DialogTitle className="mono uppercase tracking-widest text-[11px] text-left">
            {isNew ? "New customer" : `Edit ${customer?.name}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-4 py-3 space-y-4 text-[12px]">
            <FieldGroup title="Identity">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Name" err={errors.name?.message}><input className={inp} {...form.register("name")} /></F>
                <F label="Priority"><select className={inp} {...form.register("priority")}><option>VIP</option><option>High</option><option>Normal</option></select></F>
                <F label="Phone" err={errors.phone?.message}><input className={inp} {...form.register("phone")} /></F>
                <F label="Alt phone" err={errors.altPhone?.message}><input className={inp} {...form.register("altPhone")} /></F>
                <F label="Email" err={errors.email?.message}><input className={inp} {...form.register("email")} /></F>
                <F label="City" err={errors.city?.message}><input className={inp} {...form.register("city")} /></F>
              </div>
            </FieldGroup>
            <FieldGroup title="Profile">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <F label="Community"><input className={inp} {...form.register("community")} /></F>
                <F label="Occupation"><input className={inp} {...form.register("occupation")} /></F>
                <F label="Company"><input className={inp} {...form.register("company")} /></F>
                <F label="Rating (0–5)"><input type="number" className={inp} {...form.register("rating")} /></F>
                <F label="GST" err={errors.gst?.message}><input className={inp} {...form.register("gst")} /></F>
                <F label="PAN" err={errors.pan?.message}><input className={inp} {...form.register("pan")} /></F>
              </div>
            </FieldGroup>
            <FieldGroup title="Notes">
              <F label="Notes"><textarea rows={4} className={inp + " h-auto py-1.5"} {...form.register("notes")} /></F>
            </FieldGroup>
          </div>
          <DialogFooter className="px-3 sm:px-4 py-2.5 border-t border-border gap-2 shrink-0 bg-surface">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">{isNew ? "Create" : "Save"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inp = "w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent";
function F({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">{label}</div>
      {children}
      {err && <div className="text-[10px] text-conflict mt-0.5">{err}</div>}
    </label>
  );
}
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">{title}</div>
      {children}
    </section>
  );
}
