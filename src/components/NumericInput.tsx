import React, { useState, useEffect } from "react";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string | number;
  onChange: (value: string) => void;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const toCleanString = (val: any) => {
    if (val === undefined || val === null) return "";
    return String(val).replace(/\D/g, "");
  };

  useEffect(() => {
    const clean = toCleanString(value);
    if (!isFocused) {
      setLocalValue(clean === "" ? "" : Number(clean).toLocaleString("vi-VN"));
    } else {
      const cleanLocal = toCleanString(localValue);
      if (cleanLocal !== clean) {
        setLocalValue(clean);
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.replace(/\D/g, "");
    setLocalValue(clean);
    onChange(clean);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const clean = toCleanString(value);
    setLocalValue(clean);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const clean = toCleanString(value);
    setLocalValue(clean === "" ? "" : Number(clean).toLocaleString("vi-VN"));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
};
