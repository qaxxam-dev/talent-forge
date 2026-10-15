import { IntakeScreen } from "@/components/intake/IntakeScreen";

export function meta() {
  return [
    { title: "Campus Drive Intake — TalentForge" },
    {
      name: "description",
      content:
        "Review shortlisted candidates, evaluate day-zero readiness, and launch targeted Code-Defend viva sessions.",
    },
  ];
}

export default function IndexRoute() {
  return <IntakeScreen />;
}
