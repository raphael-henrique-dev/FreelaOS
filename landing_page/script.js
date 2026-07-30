document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("waitlist-form");
    const emailInput = document.getElementById("email");
    const message = document.getElementById("form-message");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        
        if (email) {
            // Mock de envio para API
            console.log("=== NOVO LEAD CAPTURADO ===");
            console.log("Email salvo na lista de espera:", email);
            console.log("===========================");

            // Feedback visual
            const btn = form.querySelector("button");
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="check"></i> Salvo!`;
            lucide.createIcons();
            
            message.textContent = "Excelente! Você está na lista de espera. Avisaremos em breve.";
            message.style.color = "#10b981"; // success green
            
            emailInput.value = "";
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                lucide.createIcons();
            }, 3000);
        }
    });

    // Mockup animado de logs (Hero section)
    const logContainer = document.querySelector('.mockup-log');
    if(logContainer) {
        const logs = [
            "[Redator] Rascunho finalizado com sucesso.",
            "[Sender] Enviando proposta para o cliente...",
            "[Sender] Proposta enviada! Status: Entregue.",
            "[Scout] Vasculhando novas vagas na Workana...",
            "[Scout] Nova vaga encontrada: Designer UI/UX",
            "[Analista] Vaga 93ce85c8-43cb-427e-99b6 ignorada. Motivo: Orçamento baixo."
        ];
        
        let index = 0;
        setInterval(() => {
            const p = document.createElement("p");
            p.textContent = logs[index];
            p.style.opacity = "0";
            
            logContainer.appendChild(p);
            
            // Fade In
            setTimeout(() => { p.style.opacity = "1"; p.style.transition = "opacity 0.5s"; }, 10);
            
            // Remove o primeiro se tiver mais de 5 para não estourar a div
            if(logContainer.children.length > 5) {
                logContainer.removeChild(logContainer.firstChild);
            }
            
            index = (index + 1) % logs.length;
        }, 1500);
    }

    // Função para Efeito Parallax 3D
    function applyParallax(selector, maxRotation = 8) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left; // x position within the element
                const y = e.clientY - rect.top;  // y position within the element
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -maxRotation;
                const rotateY = ((x - centerX) / centerX) * maxRotation;
                
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });
            
            el.addEventListener('mouseleave', () => {
                el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
                el.style.transition = `transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)`;
            });
            
            el.addEventListener('mouseenter', () => {
                el.style.transition = `transform 0.1s ease-out`;
            });
        });
    }

    // Aplica o Parallax
    applyParallax('.dashboard-hero-wrapper', 8);
    applyParallax('.hero-mockup', 5);
    applyParallax('.waitlist-container', 4);
    applyParallax('.solution-text', 3);
});
