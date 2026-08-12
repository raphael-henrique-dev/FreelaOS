import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/core/api";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Olá! Sou o Nexus, seu assistente pessoal do FreelaOS. Como posso ajudar hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom();
      }, 300); // Wait for the morph animation to settle
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput("");
    const newMessages = [...messages, { id: Date.now().toString(), role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsTyping(true);

    // Adiciona uma mensagem vazia do assistente que será preenchida via stream
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
        
        // SSE format is data: {...}\n\n
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
              
              // Atualiza o estado da última mensagem
              setMessages((prev) => 
                prev.map(msg => 
                  msg.id === assistantMsgId ? { ...msg, content: assistantContent } : msg
                )
              );
            } catch (err) {
              // Ignore parse errors from partial chunks
            }
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
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            layoutId="assistant-widget-container"
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110"
            style={{ borderRadius: "9999px" }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="assistant-widget-container"
            className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-elegant backdrop-blur-xl"
            style={{ borderRadius: "16px" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Oculta os itens do header enquanto está animando para não quebrar o layout */}
            <motion.div 
              className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-none">Nexus IA</h3>
                  <span className="text-[10px] text-muted-foreground">Assistente Pessoal</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setIsOpen(false); navigate({ to: "/assistente" }); }}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  if (!msg.content && msg.role === "assistant") return null;
                  
                  return (
                    <motion.div 
                      key={msg.id} 
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", msg.role === "user" ? "bg-muted" : "bg-primary/20 text-primary")}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={cn("rounded-2xl px-4 py-2 max-w-[80%] text-sm", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 border border-border/50 rounded-tl-sm")}>
                        {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        ) : (
                            msg.content
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              <AnimatePresence>
                {isTyping && (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="flex items-center rounded-2xl bg-muted/50 border border-border/50 px-4 py-2 rounded-tl-sm">
                      <span className="text-xs text-muted-foreground">Processando ferramentas...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <motion.div 
              className="border-t border-border/50 bg-muted/10 p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Peça ao Nexus..."
                  className="flex-1 rounded-full border border-border/50 bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  disabled={isTyping}
                />
                <Button type="submit" size="icon" className="h-9 w-9 rounded-full shrink-0" disabled={!input.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
