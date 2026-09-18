from django.urls import path

from hos import views

urlpatterns = [
    path('api/plan', views.PlanView.as_view()),
    path('api/plans', views.PlansView.as_view()),
    path('api/plans/<uuid:plan_id>', views.PlanDetailView.as_view()),
]