import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, BrainCircuit, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/core/api";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Nexus IA · FreelaOS" },
      { name: "description", content: "Seu assistente pessoal de IA com acesso aos dados da plataforma." },
    ],
  }),
  component: AssistentePage,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function AssistentePage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Olá! Sou o Nexus, seu assistente pessoal e braço direito no FreelaOS.\n\nEu tenho acesso aos seus dados de faturamento, propostas e configurações. Como posso te ajudar hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput("");
    const newMessages = [...messages, { id: Date.now().toString(), role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsTyping(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(`${api.defaults.baseURL || 'http://localhost:8000'}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: session.user.id
        })
      });

      if (!response.body) throw new Error("Sem resposta do servidor");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        const events = chunkStr.split("\n\n");
        for (const event of events) {
          if (event.startsWith("data: ")) {
            try {
              const data = JSON.parse(event.replace("data: ", ""));
              if (data.error) {
                assistantContent += `\n\n**Erro:** ${data.error}`;
              } else if (data.text) {
                assistantContent += data.text;
              }
              
              setMessages((prev) => 
                prev.map(msg => 
                  msg.id === assistantMsgId ? { ...msg, content: assistantContent } : msg
                )
              );
            } catch (err) {}
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === assistantMsgId ? { ...msg, content: `Erro ao conectar com o Nexus: ${error.message}` } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Nexus IA" 
        description="Converse com seu assistente"
      />
      
      <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elegant relative">
        {/* Fundo Decorativo */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          {/* Header Interno (Opcional, mas dá charme) */}
          <div className="flex items-center gap-3 border-b border-border/50 bg-muted/20 px-6 py-4">
             {/* <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow">
                <BrainCircuit className="h-5 w-5" />
             </div> */}
             <div>
                <h3 className="text-lg font-bold">Nexus</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Agente online
                </p>
             </div>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              if (!msg.content && msg.role === "assistant") return null;

              return (
                <div key={msg.id} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm", msg.role === "user" ? "bg-muted border border-border/50" : "bg-primary/20 text-primary border border-primary/30")}>
                    {msg.role === "user" ? <User className="h-5 w-5 text-muted-foreground" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={cn("rounded-3xl px-6 py-4 max-w-[80%] text-sm/relaxed shadow-sm", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/30 border border-border/60 rounded-tl-sm backdrop-blur-sm")}>
                     {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                           <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                     ) : (
                        msg.content
                     )}
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="flex items-center rounded-3xl bg-muted/30 border border-border/60 px-6 py-4 rounded-tl-sm shadow-sm backdrop-blur-sm">
                  <span className="text-xl text-muted-foreground animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input */}
          <div className="border-t border-border/50 bg-background/50 p-4 backdrop-blur-xl">
            <form onSubmit={handleSend} className="mx-auto flex max-w-4xl items-center gap-3 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: Como está a performance do meu perfil hoje? Ou 'Ligue o Scout'..."
                className="flex-1 rounded-full border border-border/80 bg-card px-6 py-4 pr-14 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-inner"
                disabled={isTyping}
              />
              <Button type="submit" size="icon" className="absolute right-2 h-10 w-10 rounded-full shadow-glow" disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-center text-xs text-muted-foreground">O Nexus usa inteligência artificial avançada. Respostas e ações são registradas no histórico.</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
