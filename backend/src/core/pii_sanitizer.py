import re

# Padrões Regex para dados pessoais comuns em prospecção brasileira e internacional
EMAIL_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    re.IGNORECASE
)

# Telefones: (11) 99999-9999, 11 99999-9999, +55 11 99999-9999, 99999-9999, etc.
PHONE_REGEX = re.compile(
    r'(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9\s?)?\d{4}[\s.-]?\d{4}\b'
)

# Links de WhatsApp
WHATSAPP_LINK_REGEX = re.compile(
    r'(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/[0-9+]+',
    re.IGNORECASE
)

# CPF: 000.000.000-00 ou 11 dígitos com pontuação
CPF_REGEX = re.compile(
    r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b'
)

# CNPJ: 00.000.000/0001-00
CNPJ_REGEX = re.compile(
    r'\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b'
)


def sanitize_pii(text: str) -> str:
    """
    Remove ou ofusca Informações de Identificação Pessoal (PII) 
    de textos de vagas ou mensagens de clientes antes de serem enviados para LLMs terceiras,
    atendendo ao princípio da minimização de dados da LGPD (Art. 6º, III).
    """
    if not text:
        return text

    sanitized = text
    # 1. Links WhatsApp
    sanitized = WHATSAPP_LINK_REGEX.sub("[LINK_WHATSAPP_REMOVIDO]", sanitized)
    # 2. E-mails
    sanitized = EMAIL_REGEX.sub("[EMAIL_REMOVIDO]", sanitized)
    # 3. CPFs e CNPJs
    sanitized = CPF_REGEX.sub("[CPF_REMOVIDO]", sanitized)
    sanitized = CNPJ_REGEX.sub("[CNPJ_REMOVIDO]", sanitized)
    # 4. Telefones (aplica apenas se tiver pelo menos 8 dígitos para evitar pegar números avulsos de orçamentos)
    sanitized = PHONE_REGEX.sub("[TELEFONE_REMOVIDO]", sanitized)

    return sanitized
