from django.db import migrations

PAPEIS = ["Administrador", "Caixa", "Atendente", "Estoquista"]


def criar_papeis(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for nome in PAPEIS:
        Group.objects.get_or_create(name=nome)


def remover_papeis(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=PAPEIS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("contas", "0002_logauditoria"),
    ]

    operations = [
        migrations.RunPython(criar_papeis, remover_papeis),
    ]
