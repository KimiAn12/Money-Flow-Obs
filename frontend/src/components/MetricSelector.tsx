import { FlowMetric } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MetricSelectorProps {
  selected: FlowMetric;
  onSelect: (metric: FlowMetric) => void;
}

const metrics: { value: FlowMetric; label: string }[] = [
  { value: 'correlation', label: 'Correlation' },
  { value: 'netFlow', label: 'Net Flow %' },
  { value: 'rollingCorr', label: 'Rolling Correlation' },
];

export const MetricSelector = ({ selected, onSelect }: MetricSelectorProps) => {
  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-48 glass-card border-border/50">
        <SelectValue placeholder="Select metric" />
      </SelectTrigger>
      <SelectContent className="glass-card border-border/50 bg-popover">
        {metrics.map((metric) => (
          <SelectItem key={metric.value} value={metric.value}>
            {metric.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
