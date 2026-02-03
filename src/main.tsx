import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  getYear,
  setYear,
  getMonth,
  setMonth,
  getDaysInMonth,
  getDay,
  addDays,
  isToday,
} from "date-fns";
import { createPortal } from "react-dom";
import { cn } from "./utils/cn";
import { convertDate } from "./utils/helper";

// import Label from "../common/label/label";
// import InputError from "../common/error/input-error";

interface Props {
  name: string;
  value?: string | { startDate: string; endDate: string };
  onChange?: (value: string | { startDate: string; endDate: string }) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  enableTime?: boolean;
  placeholder?: string;
  range?: boolean;
  yearsRange?: number;
  size?: "sm" | "md";
  floatLabel?: boolean;
  required?: boolean;
}

function formatLocalDateTime(input?: string | Date): string {
  if (!input) return "-";
  const date = new Date(input);
  if (isNaN(date.getTime())) return "-";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${months[date.getMonth()]} ${date
    .getDate()
    .toString()
    .padStart(2, "0")}, ${date.getFullYear()} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function parseDateValue(value: string): Date | null {
  // UTC ISO (backend) - extract UTC components and treat as local time
  if (value.endsWith("Z")) {
    const date = new Date(value);
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
  }

  // DateTime from form: MM/DD/YYYY HH:mm
  if (value.includes("/") && value.includes(":")) {
    return new Date(value);
  }

  // Date only: YYYY-MM-DD (date picker)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return null;
}

const DateInput: React.FC<Props> = ({
  // name,
  value,
  onChange,
  error,
  disabled,
  // label,
  placeholder,
  enableTime = false,
  range = false,
  // required,
  size = "md",
  // floatLabel = false,
}) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [yearInput, setYearInput] = useState(getYear(new Date()).toString());
  // const [isFocused, setIsFocused] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const sizeStyle = {
    md: "py-3",
    sm: "py-2",
  };

  useEffect(() => {
    let container = document.getElementById("calendar-portal");
    if (!container) {
      container = document.createElement("div");
      container.id = "calendar-portal";
      document.body.appendChild(container);
    }
    setPortalContainer(container);
  }, []);

  useLayoutEffect(() => {
    if (!showCalendar || !portalContainer || !portalRef.current) return;

    setPosition(null);

    const calculatePosition = () => {
      if (!portalRef.current) return;

      const rect = portalRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const GAP = 8;
      const calendarHeight = 350;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + GAP;
      if (spaceBelow < calendarHeight && spaceAbove > spaceBelow) {
        top = rect.top - calendarHeight + GAP;
      }

      setPosition({
        top: Math.max(0, Math.min(top, viewportHeight - calendarHeight)),
        left: rect.left,
        width: rect.width,
      });
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition, true);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [showCalendar, portalContainer]);

  const generateDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const startWeekday = getDay(start);
    const days = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push(addDays(start, -(startWeekday - i)));
    }

    for (let i = 0; i < daysInMonth; i++) {
      days.push(addDays(start, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(addDays(end, i));
    }

    return days;
  };

  const days = generateDays();
  const currentYear = getYear(new Date());
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    setYearInput(getYear(currentMonth).toString());
  }, [currentMonth]);

  const applyTimeToDate = (date: Date) => {
    const localDate = new Date(date);
    localDate.setHours(selectedHour);
    localDate.setMinutes(selectedMinute);
    return localDate;
  };

  const handleDateChange = (date: Date) => {
    if (enableTime) date = applyTimeToDate(date);

    if (range) {
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      } else if (selectedStartDate && !selectedEndDate) {
        if (isBefore(date, selectedStartDate)) {
          setSelectedEndDate(selectedStartDate);
          setSelectedStartDate(date);
        } else {
          setSelectedEndDate(date);
        }
      }
    } else {
      setSelectedDate(date);
      setShowCalendar(false);

      // Emit change
      if (onChange) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = enableTime ? String(date.getHours()).padStart(2, "0") : "00";
        const minutes = enableTime ? String(date.getMinutes()).padStart(2, "0") : "00";
        const utcString = `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
        onChange(utcString);
      }
    }
  };

  const updateTimeOnSelectedDate = () => {
    if (!range) {
      if (selectedDate && onChange) {
        const updatedDate = applyTimeToDate(selectedDate);
        setSelectedDate(updatedDate);

        const year = updatedDate.getFullYear();
        const month = String(updatedDate.getMonth() + 1).padStart(2, "0");
        const day = String(updatedDate.getDate()).padStart(2, "0");
        const hours = String(updatedDate.getHours()).padStart(2, "0");
        const minutes = String(updatedDate.getMinutes()).padStart(2, "0");
        const utcString = `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
        onChange(utcString);
      }
    } else {
      if (selectedEndDate) {
        setSelectedEndDate(applyTimeToDate(selectedEndDate));
      } else if (selectedStartDate) {
        setSelectedStartDate(applyTimeToDate(selectedStartDate));
      }
    }
  };

  const handleHourChange = (hour: number) => setSelectedHour(hour);
  const handleMinuteChange = (minute: number) => setSelectedMinute(minute);

  const handleYearChange = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
  };

  const handleMonthChange = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
  };

  const isInRange = (date: Date) => {
    if (range && selectedStartDate) {
      if (selectedEndDate) {
        return isWithinInterval(date, {
          start: selectedStartDate,
          end: selectedEndDate,
        });
      } else if (hoverDate) {
        const start = isBefore(selectedStartDate, hoverDate)
          ? selectedStartDate
          : hoverDate;
        const end = isBefore(selectedStartDate, hoverDate)
          ? hoverDate
          : selectedStartDate;
        return isWithinInterval(date, { start, end });
      }
    }
    return false;
  };

  const getDayClass = (day: Date) => {
    let classes =
      "w-8 h-8 flex items-center justify-center rounded-full text-sm";

    if (getMonth(day) !== getMonth(currentMonth)) {
      classes += " text-gray-400";
    } else {
      classes += " text-gray-800";
    }

    if (isToday(day)) {
      classes += " font-700 border border-primary";
    }

    if (range) {
      if (selectedStartDate && isSameDay(day, selectedStartDate)) {
        classes += " bg-primary text-white";
      } else if (selectedEndDate && isSameDay(day, selectedEndDate)) {
        classes += " bg-primary text-white";
      } else if (isInRange(day)) {
        classes += " bg-primary";
      }
    } else if (selectedDate && isSameDay(day, selectedDate)) {
      classes += " bg-primary text-white";
    }

    if (getMonth(day) === getMonth(currentMonth)) {
      classes += " hover:bg-black/10";
    }

    return classes;
  };

  const formatDisplayValue = useMemo(() => {
    if (range) {
      if (selectedStartDate && selectedEndDate) {
        return `${format(selectedStartDate, "MM/dd/yyyy")} - ${format(selectedEndDate, "MM/dd/yyyy")}`;
      } else if (selectedStartDate) {
        return `${format(selectedStartDate, "MM/dd/yyyy")} - `;
      }
      return "";
    } else {
      return selectedDate
        ? format(selectedDate, enableTime ? "MM/dd/yyyy HH:mm" : "MM/dd/yyyy")
        : "";
    }
  }, [range, selectedStartDate, selectedEndDate, selectedDate, enableTime]);

  const handleCalendarClose = () => {
    if (range && selectedStartDate && !selectedEndDate) {
      setSelectedEndDate(selectedStartDate);
    }
    setShowCalendar(false);
    // setIsFocused(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showCalendar &&
        !portalRef.current?.contains(target) &&
        !portalContainer?.contains(target)
      ) {
        handleCalendarClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar, portalContainer]);

  // const hasValue = Boolean(formatDisplayValue);
  // const shouldFloatLabel = isFocused || hasValue;

  const syncFieldValueToState = (val: any) => {
    if (!val) {
      if (!range) {
        setSelectedDate(null);
      } else {
        setSelectedStartDate(null);
        setSelectedEndDate(null);
      }
      return;
    }

    if (range && typeof val === "object" && val.startDate) {
      const startDate = new Date(val.startDate);
      const endDate = val.endDate ? new Date(val.endDate) : null;

      if (!isNaN(startDate.getTime())) {
        if (!selectedStartDate || !isSameDay(startDate, selectedStartDate)) {
          setSelectedStartDate(startDate);
          setSelectedHour(startDate.getHours());
          setSelectedMinute(startDate.getMinutes());
          setCurrentMonth(startDate);
        }
      }

      if (endDate && !isNaN(endDate.getTime())) {
        if (!selectedEndDate || !isSameDay(endDate, selectedEndDate)) {
          setSelectedEndDate(endDate);
        }
      }
    } else if (range && typeof val === "string" && val.includes(" - ")) {
      const [start, end] = val.split(" - ");
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (!isNaN(startDate.getTime())) {
        if (!selectedStartDate || !isSameDay(startDate, selectedStartDate)) {
          setSelectedStartDate(startDate);
          setSelectedHour(startDate.getHours());
          setSelectedMinute(startDate.getMinutes());
          setCurrentMonth(startDate);
        }
      }

      if (!isNaN(endDate.getTime())) {
        if (!selectedEndDate || !isSameDay(endDate, selectedEndDate)) {
          setSelectedEndDate(endDate);
        }
      }
    } else if (!range && typeof val === "string") {
      const date = parseDateValue(val);
      if (date && !isNaN(date.getTime())) {
        if (!selectedDate || !isSameDay(date, selectedDate)) {
          setSelectedDate(date);
          setSelectedHour(date.getHours());
          setSelectedMinute(date.getMinutes());
          setCurrentMonth(date);
        }
      }
    }
  };

  // Sync external value to internal state
  useEffect(() => {
    syncFieldValueToState(value);
  }, [value]);

  // Update time when hour/minute changes
  useEffect(() => {
    if (enableTime && selectedDate) {
      updateTimeOnSelectedDate();
    }
  }, [selectedHour, selectedMinute]);

  const displayValue = formatDisplayValue
    ? enableTime
      ? formatLocalDateTime(formatDisplayValue)
      : convertDate(formatDisplayValue)
    : placeholder;

  return (
    <div className="relative" ref={targetRef}>
      {/* {floatLabel && (
        <Label
          title={label}
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none",
            shouldFloatLabel
              ? "-top-2 text-xs bg-white px-1"
              : `top-1/2 -translate-y-1/2 text-sm text-gray-500`
          )}
          required={required}
        />
      )}
      {label && !floatLabel && <Label title={label} required={required} />} */}
      <div ref={portalRef}>
        <div
          onClick={() => {
            if (!disabled) {
              setShowCalendar(!showCalendar);
              // setIsFocused(true);
            }
          }}
          className={cn(
            "cursor-pointer border rounded px-3 text-sm w-full focus:outline-none",
            sizeStyle[size],
            disabled ? "bg-gray-100 cursor-not-allowed" : "",
            error ? "border-red-500" : "border-gray-300"
          )}
        >
          {displayValue || placeholder}
        </div>

        {showCalendar && portalContainer && position &&
          createPortal(
            <div
              className="bg-white shadow-lg rounded-md p-4 z-50 absolute"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
                minWidth: "300px",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-light"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>

                <div className="flex gap-2">
                  <select
                    value={getMonth(currentMonth)}
                    onChange={(e) => handleMonthChange(Number(e.target.value))}
                    className="border border-light rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {months.map((month, idx) => (
                      <option key={idx} value={idx}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={yearInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setYearInput(value);
                        if (value.length === 4) {
                          handleYearChange(Number(value));
                        }
                      }
                    }}
                    onBlur={() => {
                      let year = parseInt(yearInput);
                      if (isNaN(year)) year = currentYear;
                      year = Math.max(1000, Math.min(9999, year));
                      setYearInput(year.toString());
                      handleYearChange(year);
                    }}
                    className="border rounded px-2 py-1 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-primary"
                    min="1000"
                    max="9999"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-light"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => (
                  <button
                    key={day.toString()}
                    type="button"
                    className={getDayClass(day)}
                    onClick={() => {
                      const dateWithTime = enableTime
                        ? applyTimeToDate(day)
                        : day;
                      handleDateChange(dateWithTime);
                    }}
                    onMouseEnter={() => setHoverDate(day)}
                    onMouseLeave={() => setHoverDate(null)}
                  >
                    {format(day, "d")}
                  </button>
                ))}
              </div>

              {enableTime && !range && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Hour:</span>
                    <select
                      value={selectedHour}
                      onChange={(e) => handleHourChange(Number(e.target.value))}
                      className="border border-light rounded px-1 py-0.5 text-sm focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Min:</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) =>
                        handleMinuteChange(Number(e.target.value))
                      }
                      className="border border-light rounded px-1 py-0.5 text-sm focus:outline-none"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {range && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                    onClick={() => {
                      setSelectedStartDate(null);
                      setSelectedEndDate(null);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
                    onClick={() => {
                      if (selectedStartDate && onChange) {
                        const endDate = selectedEndDate || selectedStartDate;

                        const toUTCString = (date: Date) => {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const day = String(date.getDate()).padStart(2, "0");
                          const hours = String(date.getHours()).padStart(
                            2,
                            "0"
                          );
                          const minutes = String(date.getMinutes()).padStart(
                            2,
                            "0"
                          );
                          return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
                        };

                        onChange({
                          startDate: toUTCString(selectedStartDate),
                          endDate: toUTCString(endDate),
                        });
                        handleCalendarClose();
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>,
            portalContainer
          )}
      </div>

      {/* {error && <InputError error={error} />} */}
    </div>
  );
};

export default DateInput;