from django.contrib.auth.models import Group
from rest_framework import serializers

from .models import Usuario


class PapelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class UsuarioSerializer(serializers.ModelSerializer):
    """Usada para listar/visualizar usuários (somente leitura)."""

    papeis = PapelSerializer(source="groups", many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_superuser",
            "papeis",
        ]


class UsuarioCreateUpdateSerializer(serializers.ModelSerializer):
    """Usada para criar e editar usuários (recebe senha e papéis)."""

    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    papeis_ids = serializers.PrimaryKeyRelatedField(
        source="groups", many=True, queryset=Group.objects.all(), required=False
    )

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "password",
            "papeis_ids",
        ]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Senha é obrigatória ao criar um usuário."}
            )
        return attrs

    def create(self, validated_data):
        papeis = validated_data.pop("groups", [])
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        usuario.groups.set(papeis)
        return usuario

    def update(self, instance, validated_data):
        papeis = validated_data.pop("groups", None)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if papeis is not None:
            instance.groups.set(papeis)
        return instance
