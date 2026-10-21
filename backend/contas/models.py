from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    """
    Usuário do sistema. Fica como um app próprio (em vez de usar o
    ``auth.User`` padrão do Django) porque, a partir do Ciclo 1, vamos
    adicionar os papéis (Administrador, Caixa, Atendente, Estoquista) e
    trocar o AUTH_USER_MODEL depois é muito mais trabalhoso do que já
    começar com um modelo próprio.
    """
