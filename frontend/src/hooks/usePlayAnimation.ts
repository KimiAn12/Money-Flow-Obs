import { useState, useRef, useCallback, useEffect } from "react";

interface UsePlayAnimationOptions {
  totalSteps: number;
  duration?: number; // Animation duration in milliseconds
  onStepChange: (step: number) => void;
  onComplete?: () => void;
}

/**
 * Simple animation hook for 3-second play animation
 * No controls, just play and animate
 */
export const usePlayAnimation = ({
  totalSteps,
  duration = 3000, // 3 seconds default
  onStepChange,
  onComplete,
}: UsePlayAnimationOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(-1);

  const play = useCallback(() => {
    if (totalSteps === 0 || totalSteps === 1) return;
    
    // Cancel any existing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(true);
    setCurrentStep(0);
    lastStepRef.current = -1;
    startTimeRef.current = Date.now();
    
    const animate = () => {
      if (!startTimeRef.current) {
        setIsPlaying(false);
        return;
      }
      
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate current step based on progress
      const step = Math.floor(progress * (totalSteps - 1));
      
      // Only update if step changed
      if (step !== lastStepRef.current) {
        lastStepRef.current = step;
        setCurrentStep(step);
        onStepChange(step);
      }
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure we're at the last step
        const finalStep = totalSteps - 1;
        if (lastStepRef.current !== finalStep) {
          lastStepRef.current = finalStep;
          setCurrentStep(finalStep);
          onStepChange(finalStep);
        }
        
        // Clean up
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        startTimeRef.current = null;
        setIsPlaying(false);
        onComplete?.();
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [totalSteps, duration, onStepChange, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, []);

  return {
    play,
    isPlaying,
    currentStep,
  };
};

