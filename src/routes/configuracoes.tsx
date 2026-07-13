import { createFileRoute } from "@tanstack/react-router";
import { Github, Linkedin, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · FreelaOS" }] }),
  component: ConfigPage,
});

const stacks = ["React", "Next.js", "TypeScript", "Tailwind", "Node.js", "Java", "Spring Boot", "PostgreSQL", "React Native", "OpenAI"];

const integrations = [
  { name: "99Freelas", desc: "Sincronize propostas e mensagens", enabled: true },
  { name: "Workana", desc: "Coleta automática de projetos", enabled: true },
  { name: "GitHub", desc: "Vincule portfólio e repositórios", enabled: false },
  { name: "LinkedIn", desc: "Sync de experiência profissional", enabled: false },
  { name: "OpenAI", desc: "Motor padrão dos agentes", enabled: true },
  { name: "Claude", desc: "Motor alternativo para propostas longas", enabled: false },
  { name: "Google Gemini", desc: "Análise multimodal de briefings", enabled: false },
];

function ConfigPage() {
  return (
    <PageContainer>
      <PageHeader title="Configurações" description="Perfil, portfólio, stacks e integrações." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-glow">
                LR
              </div>
              <div>
                <p className="text-lg font-semibold">Lucas Ribeiro</p>
                <p className="text-sm text-muted-foreground">Full-stack · 6 anos de experiência</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" defaultValue="Lucas Ribeiro" />
              <Field label="Email" defaultValue="lucas@freelaos.dev" />
              <Field label="Cidade" defaultValue="São Paulo, BR" />
              <Field label="Fuso" defaultValue="GMT-3" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bio</Label>
              <Textarea
                defaultValue="Desenvolvedor full-stack com foco em produtos SaaS. Especialista em stacks modernas com React, Node e Java."
                className="mt-1 min-h-[100px] border-border/50 bg-background/40"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Portfólio & Stacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Tecnologias dominadas</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {stacks.map((s) => (
                  <Badge key={s} variant="outline" className="border-border/60 bg-background/40">
                    {s}
                  </Badge>
                ))}
                <Badge variant="outline" className="cursor-pointer border-dashed border-primary/40 text-primary">
                  + Adicionar
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Anos de experiência</Label>
              <Input defaultValue="6" className="mt-1 border-border/50 bg-background/40" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Github className="mr-2 h-4 w-4" /> Conectar GitHub</Button>
              <Button variant="outline" size="sm"><Linkedin className="mr-2 h-4 w-4" /> Conectar LinkedIn</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Modelos de proposta</CardTitle>
            <p className="text-xs text-muted-foreground">Templates que o Redator IA usa como base.</p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {["Padrão", "Consultivo", "Direto ao ponto"].map((t) => (
              <div key={t} className="rounded-xl border border-border/50 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{t}</p>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tom {t.toLowerCase()} com estrutura em 4 blocos: intro, entendimento, plano, investimento.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Integrações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {integrations.map((i) => (
              <div key={i.name} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.desc}</p>
                  </div>
                </div>
                <Switch defaultChecked={i.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input defaultValue={defaultValue} className="mt-1 border-border/50 bg-background/40" />
    </div>
  );
}