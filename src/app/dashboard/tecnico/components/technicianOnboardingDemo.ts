export const TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID =
  "onboarding-demo-incident";

export const TECHNICIAN_ONBOARDING_DEMO_CATEGORY_ID =
  "onboarding-demo-category";

export const technicianOnboardingDemoCategoryName = "Infraestructura";

export const technicianOnboardingDemoAssignment = {
  id: TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID,
  categoria: technicianOnboardingDemoCategoryName,
  location: "Bloque 208 - Segundo piso",
  status: "Nuevo" as const,
  created_at: "2026-05-28T17:00:00.000Z",
  assigned_by_admin: "Coordinador de mantenimiento",
};

export const technicianOnboardingDemoIncident = {
  id: TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID,
  status: "Nuevo",
  priority: "Media",
  created_at: "2026-05-28T17:00:00.000Z",
  category_id: TECHNICIAN_ONBOARDING_DEMO_CATEGORY_ID,
  campus_place: "Bloque 208 - Segundo piso",
  technician_id: "onboarding-technician",
};

export const technicianOnboardingDemoDetail = {
  ...technicianOnboardingDemoIncident,
  updated_at: "2026-05-28T17:00:00.000Z",
  description:
    "Basura acumulada en el piso y luminaria intermitente cerca del salon 208.",
  latitude: 3.34664,
  longitude: -76.53231,
  student_id: "onboarding-student",
  before_photo_id: null,
  after_photo_id: null,
  before_photo_url: null,
  after_photo_url: null,
};

export const technicianOnboardingDemoCategoriesMap = {
  [TECHNICIAN_ONBOARDING_DEMO_CATEGORY_ID]:
    technicianOnboardingDemoCategoryName,
};
