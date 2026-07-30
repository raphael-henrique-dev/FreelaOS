export default async function handler(req, res) {
    // 1. Proteção Básica de CORS (Apenas permite acesso do próprio domínio e localhost)
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = ['freelaos.app', 'localhost', '127.0.0.1'];
    const isAllowed = allowedOrigins.some(domain => origin.includes(domain));
    
    // Descomente a linha abaixo em produção rigorosa se não quiser permitir localhost
    if (!isAllowed && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Acesso negado (CORS)' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email } = req.body;

    // (Anti-Spam / Anti-Crash)
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'E-mail inválido' });
    }

    if (email.length > 100) {
        return res.status(400).json({ error: 'O e-mail é longo demais' });
    }

    // RegEx simples mas eficiente para validar o formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de e-mail inválido' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Missing Supabase environment variables');
        return res.status(500).json({ error: 'Erro de configuração no servidor' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao inserir no Supabase');
        }

        return res.status(200).json({ success: true, message: 'Lead capturado com sucesso' });
    } catch (error) {
        console.error('Supabase Error:', error);
        return res.status(500).json({ error: 'Erro interno ao processar cadastro' });
    }
}
