document.addEventListener("DOMContentLoaded", () => {
    const waitlistForm = document.getElementById('waitlist-form');
    if(waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = waitlistForm.querySelector('input[type="email"]');
            const submitBtn = waitlistForm.querySelector('button');
            const message = document.getElementById("form-message");
            const originalBtnText = submitBtn.innerHTML;
            
            if(emailInput.value) {
                submitBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Processando...';
                submitBtn.disabled = true;
                emailInput.disabled = true;
                
                try {
                    const response = await fetch('/api/leads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: emailInput.value })
                    });
                    
                    const data = await response.json();
                    
                    if(response.ok) {
                        submitBtn.innerHTML = '<i data-lucide="check"></i> Garantido!';
                        submitBtn.style.background = '#10b981';
                        submitBtn.style.borderColor = '#10b981';
                        
                        if(message) {
                            message.textContent = "Excelente! Você está na lista de espera. Avisaremos em breve.";
                            message.style.color = "#10b981";
                        }
                        
                        emailInput.value = '';
                    } else {
                        throw new Error(data.error || 'Erro ao cadastrar');
                    }
                } catch (error) {
                    console.error(error);
                    submitBtn.innerHTML = '<i data-lucide="x"></i> Tente novamente';
                    submitBtn.style.background = '#ef4444';
                    submitBtn.style.borderColor = '#ef4444';
                    
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.style.background = '';
                        submitBtn.style.borderColor = '';
                        submitBtn.disabled = false;
                        emailInput.disabled = false;
                        if(window.lucide) window.lucide.createIcons();
                    }, 3000);
                }
                
                if(window.lucide) window.lucide.createIcons();
            }
        });
    }

    const logContainer = document.querySelector('.mockup-log');
    if(logContainer) {
        const logs = [
            '<span class="log-info">[Scout]</span> Varrendo Workana para vaga "React Developer"',
            '<span class="log-info">[Scout]</span> Nova vaga encontrada: Vaga #8492',
            '<span class="log-warning">[Analista]</span> Qualificando vaga #8492... Score: 92/100',
            '<span class="log-success">[Redator]</span> Proposta gerada com sucesso! (98% match)',
            '<span class="log-success">[Sender]</span> Proposta enviada para o cliente (Orçamento: R$ 4.500)',
            '<span class="log-info">[Scout]</span> Analisando 99Freelas... 3 novas vagas'
        ];
        
        let index = 0;
        setInterval(() => {
            const p = document.createElement('p');
            p.innerHTML = `> ${logs[index]}`;
            logContainer.appendChild(p);
            
            if(logContainer.children.length > 5) {
                logContainer.removeChild(logContainer.firstChild);
            }
            
            index = (index + 1) % logs.length;
        }, 1500);
    }

    function applyParallax(selector, maxRotation = 8) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
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

    applyParallax('.dashboard-hero-wrapper', 8);
    applyParallax('.hero-mockup', 5);
    applyParallax('.waitlist-container', 4);
    applyParallax('.solution-text', 3);
});
