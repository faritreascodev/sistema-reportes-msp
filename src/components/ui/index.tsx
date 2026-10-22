"use client";

import { X } from "lucide-react";
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* Componentes base con la misma API/estética que shadcn/ui, sin dependencias extra. */

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
  ghost: "text-gray-700 hover:bg-gray-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ className, variant = "default", size = "md", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

const field =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-gray-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(field, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-[60px] resize-y", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(field, "h-9 pr-8", className)} {...props} />;
});

export function Label({ children, htmlFor, className, hint }: { children: ReactNode; htmlFor?: string; className?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-gray-700", className)}>
      <span>{children}</span>
      {hint && <span className="font-normal text-gray-400">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ title, description, actions, icon }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
      <div className="flex items-start gap-2.5">
        {icon && <div className="mt-0.5 text-brand-600">{icon}</div>}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "blue"; className?: string }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-brand-50 text-brand-700 ring-brand-100",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-transparent ring-inset", tones[tone], className)}>{children}</span>;
}

/** Diálogo modal basado en <dialog> nativo (foco, Esc y backdrop gestionados por el navegador). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn(
        "m-auto w-[min(560px,calc(100vw-2rem))] rounded-xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-900/50 backdrop:backdrop-blur-[1px]",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Toast({ message, tone, onClose }: { message: string | null; tone: "ok" | "error"; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, tone === "error" ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [message, tone, onClose]);
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "fixed right-4 bottom-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg",
        tone === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white",
      )}
    >
      {message}
    </div>
  );
}
