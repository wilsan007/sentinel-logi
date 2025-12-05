import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubmissionWindowStatus {
  isOpen: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  nextWindowStart: Date | null;
  daysRemaining: number;
  loading: boolean;
  currentMonth: string;
}

// Djibouti: Weekend is Friday (5) and Saturday (6)
const DJIBOUTI_WEEKEND_DAYS = [5, 6];

export function useSubmissionWindow(): SubmissionWindowStatus {
  const [status, setStatus] = useState<SubmissionWindowStatus>({
    isOpen: false,
    windowStart: null,
    windowEnd: null,
    nextWindowStart: null,
    daysRemaining: 0,
    loading: true,
    currentMonth: "",
  });

  useEffect(() => {
    calculateSubmissionWindow();
  }, []);

  const calculateSubmissionWindow = async () => {
    try {
      // Fetch holidays for the current and next month
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 2, 0); // End of next month

      const { data: holidays, error } = await supabase
        .from("djibouti_holidays")
        .select("date")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) {
        console.error("Error fetching holidays:", error);
      }

      const holidayDates = new Set(holidays?.map(h => h.date) || []);

      // Calculate submission window for current month
      const windowInfo = calculateWindowForMonth(currentYear, currentMonth, holidayDates);
      
      // Check if we're within the window
      const isOpen = today >= windowInfo.windowStart && today <= windowInfo.windowEnd;

      // If not open, calculate next window
      let nextWindowStart: Date | null = null;
      if (!isOpen) {
        if (today > windowInfo.windowEnd) {
          // Past this month's window, calculate next month
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
          const nextWindowInfo = calculateWindowForMonth(nextYear, adjustedNextMonth, holidayDates);
          nextWindowStart = nextWindowInfo.windowStart;
        } else {
          // Before this month's window
          nextWindowStart = windowInfo.windowStart;
        }
      }

      // Calculate days remaining if window is open
      let daysRemaining = 0;
      if (isOpen) {
        daysRemaining = Math.ceil((windowInfo.windowEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
      ];

      setStatus({
        isOpen,
        windowStart: windowInfo.windowStart,
        windowEnd: windowInfo.windowEnd,
        nextWindowStart,
        daysRemaining,
        loading: false,
        currentMonth: monthNames[currentMonth],
      });
    } catch (error) {
      console.error("Error calculating submission window:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const calculateWindowForMonth = (
    year: number,
    month: number,
    holidayDates: Set<string>
  ): { windowStart: Date; windowEnd: Date } => {
    // Target: 3 working days ending on the 15th
    const targetEndDay = 15;
    const requiredWorkingDays = 3;

    // Count backwards from the 15th to find start date
    let workingDaysFound = 0;
    let currentDay = targetEndDay;
    let windowEndDate: Date | null = null;
    let windowStartDate: Date | null = null;

    // First, verify the 15th itself - if it's not a working day, we still use it as reference
    const day15 = new Date(year, month, targetEndDay);
    
    // Find the actual end of window (last working day on or before 15th)
    currentDay = targetEndDay;
    while (currentDay >= 1) {
      const checkDate = new Date(year, month, currentDay);
      if (isWorkingDay(checkDate, holidayDates)) {
        if (!windowEndDate) {
          windowEndDate = checkDate;
        }
        workingDaysFound++;
        if (workingDaysFound === requiredWorkingDays) {
          windowStartDate = checkDate;
          break;
        }
      }
      currentDay--;
    }

    // If we couldn't find enough working days, extend backwards further
    if (!windowStartDate || workingDaysFound < requiredWorkingDays) {
      while (currentDay >= 1 && workingDaysFound < requiredWorkingDays) {
        const checkDate = new Date(year, month, currentDay);
        if (isWorkingDay(checkDate, holidayDates)) {
          workingDaysFound++;
          if (workingDaysFound === requiredWorkingDays) {
            windowStartDate = checkDate;
            break;
          }
        }
        currentDay--;
      }
    }

    // Fallback if something went wrong
    if (!windowStartDate) {
      windowStartDate = new Date(year, month, 13);
    }
    if (!windowEndDate) {
      windowEndDate = new Date(year, month, 15);
    }

    // Set times to start and end of day
    windowStartDate.setHours(0, 0, 0, 0);
    windowEndDate.setHours(23, 59, 59, 999);

    return { windowStart: windowStartDate, windowEnd: windowEndDate };
  };

  const isWorkingDay = (date: Date, holidayDates: Set<string>): boolean => {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split("T")[0];

    // Check if it's a weekend (Friday = 5, Saturday = 6 in Djibouti)
    if (DJIBOUTI_WEEKEND_DAYS.includes(dayOfWeek)) {
      return false;
    }

    // Check if it's a holiday
    if (holidayDates.has(dateString)) {
      return false;
    }

    return true;
  };

  return status;
}
