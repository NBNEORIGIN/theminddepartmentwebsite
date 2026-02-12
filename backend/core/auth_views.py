"""
JWT Auth views for The Mind Department admin panel.
Provides login, me, and set-password endpoints compatible with the NBNE frontend.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate


def _get_role(user):
    """Determine role from Django user flags."""
    if user.is_superuser:
        return 'owner'
    elif user.is_staff:
        return 'manager'
    return 'staff'


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    JWT login. Accepts { username, password }.
    Returns { access, refresh, user: { id, username, role, ... } }
    """
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    user = authenticate(username=username, password=password)
    if user is None:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    role = _get_role(user)

    refresh = RefreshToken.for_user(user)
    # Embed role in JWT so the frontend middleware can read it
    refresh['role'] = role
    refresh['name'] = f'{user.first_name} {user.last_name}'.strip() or user.username
    refresh['email'] = user.email

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'must_change_password': False,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return current user info."""
    user = request.user
    role = _get_role(user)

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': role,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_password_view(request):
    """Set new password for current user."""
    new_password = request.data.get('new_password', '')
    if len(new_password) < 6:
        return Response({'detail': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new_password)
    request.user.save()
    return Response({'ok': True})
