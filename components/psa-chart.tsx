import { TrendChart } from "./trend-chart";
export function PsaChart({
  values,
  threshold,
}: {
  values: { study_date: string; total: number }[];
  threshold: number;
}) {
  return (
    <TrendChart
      values={values.map((v) => ({
        date: v.study_date,
        value: Number(v.total),
      }))}
      units="ng/mL"
      threshold={threshold}
    />
  );
}
