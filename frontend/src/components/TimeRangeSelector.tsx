import { TimeRange } from "@/types";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

export const TimeRangeSelector = ({ selected, onSelect }: TimeRangeSelectorProps) => {
  return (
    <div className="flex gap-2 p-1 rounded-lg glass-card border border-border/50">
      {ranges.map((range) => (
        <motion.div key={range} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={selected === range ? "default" : "ghost"}
            size="sm"
            onClick={() => onSelect(range)}
            className={
              selected === range
                ? "bg-primary text-primary-foreground border-glow-cyan"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {range}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};
