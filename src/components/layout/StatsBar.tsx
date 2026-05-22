import React from "react";
import { NeonBentoCard } from "../common";
import { TelemetryGrid } from "../common/TelemetryGrid";

export const StatsBar: React.FC = () => (
  <NeonBentoCard
    className="!flex-col items-stretch p-4 gap-4"
    delay={0.1}
  >
    <TelemetryGrid variant="dashboard" />
  </NeonBentoCard>
);
