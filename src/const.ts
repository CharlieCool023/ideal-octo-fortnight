export const LOGIN_PATH = "/login";
export const SUPER_ADMIN_LOGIN_PATH = "/super-admin/login";

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: "Super Admin",
  state_commandant: "State Commandant",
  camp_commandant: "Camp Commandant",
  platoon_instructor: "Platoon Instructor",
  man_o_war_instructor: "Man O'War Instructor",
  soldier: "Soldier",
};

export const DASHBOARD_PATHS: Record<string, string> = {
  super_admin: "/dashboard/super-admin",
  state_commandant: "/dashboard/state-commandant",
  camp_commandant: "/dashboard/camp-commandant",
  platoon_instructor: "/dashboard/instructor",
  man_o_war_instructor: "/dashboard/man-o-war",
  soldier: "/dashboard/soldier",
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const EVALUATION_CATEGORIES = [
  { key: "leadershipInitiative", label: "Leadership & Initiative" },
  { key: "professionalBearing", label: "Professional Bearing & Conduct" },
  { key: "physicalFitness", label: "Physical Fitness" },
  { key: "communicationSkills", label: "Communication Skills" },
  { key: "technicalCompetence", label: "Technical Competence" },
  { key: "teamworkCooperation", label: "Teamwork & Cooperation" },
  { key: "reliabilityDependability", label: "Reliability & Dependability" },
  { key: "respectDignityRights", label: "Respect for Dignity & Rights" },
];

export const SCORE_LABELS: Record<number, string> = {
  2: "Poor",
  4: "Fair",
  6: "Good",
  8: "Very Good",
  10: "Excellent",
};
