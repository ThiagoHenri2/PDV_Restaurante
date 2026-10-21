def registrar_auditoria(usuario, acao, descricao=""):
    """
    Função única para registrar ações sensíveis (RF05), usada por este e
    pelos demais apps (caixa, estoque, clientes) a partir dos próximos
    ciclos. Mantém o registro de auditoria num só lugar, com uma única
    forma de uso em todo o projeto.
    """
    from .models import LogAuditoria

    LogAuditoria.objects.create(
        usuario=usuario if getattr(usuario, "is_authenticated", False) else None,
        acao=acao,
        descricao=descricao,
    )
