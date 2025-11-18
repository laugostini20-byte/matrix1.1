import { useState, useEffect } from "react";

/**
 * Custom hook for debouncing a value
 * Delays updating the debounced value until after the specified delay
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 200ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

