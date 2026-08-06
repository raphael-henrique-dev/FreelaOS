import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ClientAvatarProps {
  nome?: string | null;
  fotoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

const colorPalette = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
];

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "CL";
  const clean = name.trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

function getColorIndex(name?: string | null): number {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPalette.length;
}

export function ClientAvatar({
  nome,
  fotoUrl,
  className,
  fallbackClassName,
}: ClientAvatarProps) {
  const initials = getInitials(nome);
  const colorClass = colorPalette[getColorIndex(nome)];

  return (
    <Avatar className={cn("h-9 w-9 border border-border/40 shrink-0", className)}>
      {fotoUrl ? (
        <AvatarImage
          src={fotoUrl}
          alt={nome || "Cliente"}
          referrerPolicy="no-referrer"
          className="object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold text-xs border",
          colorClass,
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
