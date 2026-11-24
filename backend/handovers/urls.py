from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.dashboard),
    path("handovers/", views.handovers),
    path("handovers/<str:id>/", views.handover_detail),
    path("handovers/<str:id>/summary/", views.handover_summary),
]
