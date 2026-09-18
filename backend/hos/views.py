from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from hos.service import plan_trip, GeocodeError, RoutingError
from hos.adapters.mapbox_gateway import MapboxGateway
from hos.adapters.supabase_store import SupabaseStore

from django.conf import settings


def build_gateway():
    return MapboxGateway(settings.MAPBOX_TOKEN)


def build_store():
    return SupabaseStore(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def now():
    from django.utils import timezone
    return timezone.now().replace(tzinfo=None)


class PlanView(APIView):
    def post(self, request):
        required = [
            "current_location",
            "pickup_location",
            "dropoff_location",
            "current_cycle_used_hours",
        ]
        if any(request.data.get(field) in (None, "") for field in required):
            return Response(
                {"detail": f"missing fields: {', '.join(required)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload = plan_trip(
                request.data,
                build_gateway(),
                build_store(),
                clock=now,
            )
        except GeocodeError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except RoutingError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(payload)


class PlansView(APIView):
    def get(self, request):
        store = build_store()
        return Response(store.recent(limit=20))


class PlanDetailView(APIView):
    def get(self, request, plan_id):
        row = build_store().get(plan_id)
        if row is None:
            return Response(
                {"detail": "plan not found"},
                status=status.HTTP_404_NOT_FOUND,
                content_type="application/json",
            )
        return Response(row)