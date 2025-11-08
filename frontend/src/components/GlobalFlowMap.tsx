import { motion } from "framer-motion";
import { GlobalFlow, RegionData } from "@/types";
import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GlobalFlowMapProps {
  regions: RegionData[];
  flows: GlobalFlow[];
  assetType: 'equities' | 'bonds' | 'currency';
}

export const GlobalFlowMap = ({ regions, flows, assetType }: GlobalFlowMapProps) => {
  const [hoveredFlow, setHoveredFlow] = useState<GlobalFlow | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const initialPositions: Record<string, { x: number; y: number }> = {
    usa: { x: 250, y: 250 },
    europe: { x: 500, y: 200 },
    china: { x: 700, y: 250 },
    japan: { x: 750, y: 225 },
    india: { x: 650, y: 350 },
  };

  const [regionPositions, setRegionPositions] = useState<Record<string, { x: number; y: number; fx?: number; fy?: number }>>(
    Object.fromEntries(
      Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
    )
  );

  const filteredFlows = flows.filter((flow) => flow.assetType === assetType);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    
    if (containerRef.current && svgRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const svgPoint = svgRef.current.createSVGPoint();
      svgPoint.x = (mouseX - pan.x) / zoom;
      svgPoint.y = (mouseY - pan.y) / zoom;
      
      const newPanX = mouseX - svgPoint.x * newZoom;
      const newPanY = mouseY - svgPoint.y * newZoom;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);


  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRegionPositions(
      Object.fromEntries(
        Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
      )
    );
  }, []);

  const getFlowColor = () => {
    switch (assetType) {
      case 'equities': return 'rgba(0, 255, 255, 0.6)';
      case 'bonds': return 'rgba(168, 85, 247, 0.6)';
      case 'currency': return 'rgba(52, 211, 153, 0.6)';
    }
  };

  return (
    <div className="relative w-full h-full glass-card rounded-lg border border-border/50 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="glass-card border-border/50"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          className="glass-card border-border/50"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="glass-card border-border/50"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <marker
              id={`arrowhead-${assetType}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill={getFlowColor()} />
            </marker>
          </defs>

          {/* Flows */}
          {filteredFlows.map((flow, index) => {
            const source = regionPositions[flow.source];
            const target = regionPositions[flow.target];
            if (!source || !target) return null;

            const thickness = Math.log(flow.amount) / 3;

            return (
              <motion.line
                key={`${flow.source}-${flow.target}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={getFlowColor()}
                strokeWidth={thickness}
                markerEnd={`url(#arrowhead-${assetType})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: index * 0.2 }}
                onMouseEnter={() => setHoveredFlow(flow)}
                onMouseLeave={() => setHoveredFlow(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* Regions */}
          {regions.map((region) => {
            const pos = regionPositions[region.id];
            if (!pos) return null;

            return (
              <g key={region.id}>
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="rgba(6, 182, 212, 0.2)"
                  stroke="rgb(6, 182, 212)"
                  strokeWidth={2}
                  className="pointer-events-none"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="transparent"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold pointer-events-none fill-foreground"
                  style={{ userSelect: 'none' }}
                >
                  {region.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Flow Tooltip */}
      {hoveredFlow && (() => {
        const sourcePos = regionPositions[hoveredFlow.source];
        const targetPos = regionPositions[hoveredFlow.target];
        if (!sourcePos || !targetPos) return null;
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute z-30 glass-card p-3 rounded-lg border border-border/50 shadow-lg pointer-events-none"
            style={{
              left: `${(midX * zoom + pan.x)}px`,
              top: `${(midY * zoom + pan.y)}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="text-sm font-semibold text-foreground">
              {regions.find((r) => r.id === hoveredFlow.source)?.name} →{" "}
              {regions.find((r) => r.id === hoveredFlow.target)?.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Flow: ${(hoveredFlow.amount / 1e9).toFixed(2)}B
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              Type: {hoveredFlow.assetType}
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};
