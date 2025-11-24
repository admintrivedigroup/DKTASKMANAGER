import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from 'react-use';

/**
 * Custom hook for managing onboarding tour state
 * @param {string} tourId - Unique identifier for the tour
 * @param {Array} steps - Array of tour steps
 * 
 * @example
 * const { 
 *   currentStep, 
 *   isActive, 
 *   startTour, 
 *   nextStep, 
 *   previousStep, 
 *   skipTour 
 * } = useOnboarding('dashboard-tour', tourSteps);
 */
const useOnboarding = (tourId, steps = []) => {
  const [hasCompletedTour, setHasCompletedTour] = useLocalStorage(
    `onboarding-${tourId}`,
    false
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Auto-start tour if not completed
  useEffect(() => {
    if (!hasCompletedTour && steps.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, steps.length]);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour completed
      setIsActive(false);
      setHasCompletedTour(true);
    }
  }, [currentStepIndex, steps.length, setHasCompletedTour]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedTour(true);
  }, [setHasCompletedTour]);

  const resetTour = useCallback(() => {
    setHasCompletedTour(false);
    setCurrentStepIndex(0);
    setIsActive(false);
  }, [setHasCompletedTour]);

  const goToStep = useCallback((index) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  return {
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    totalSteps: steps.length,
    isActive,
    hasCompletedTour,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    resetTour,
    goToStep,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
  };
};

export default useOnboarding;
