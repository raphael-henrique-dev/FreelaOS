import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageContainer, PageHeader } from "@/components/page-header";
import { clients, currency, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · FreelaOS" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const current = clients.find((c) => c.id === open) ?? null;

  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Todo o relacionamento comercial em um só lugar." />

      <Card className="border-border/60 bg-card/60">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer border-border/50" onClick={() => setOpen(c.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {c.avatar}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.projects}</TableCell>
                  <TableCell>{currency(c.totalValue)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.lastContact}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!current} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full border-l border-border/60 bg-card sm:max-w-lg">
          {current ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {current.avatar}
                  </div>
                  {current.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5 px-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Metric label="Projetos" value={current.projects.toString()} />
                  <Metric label="Valor" value={currency(current.totalValue)} />
                  <Metric label="Status" value={current.status} />
                </div>
                <section>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Histórico</p>
                  <div className="mt-2 space-y-2">
                    {current.history.map((h, i) => (
                      <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">{h.date}</p>
                        <p className="mt-0.5">{h.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Notas</p>
                  <p className="mt-2 text-sm text-foreground/90">{current.notes}</p>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}