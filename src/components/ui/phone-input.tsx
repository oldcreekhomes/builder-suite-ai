import React from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneInput } from "@/lib/phoneFormat";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatPhoneInput(e.target.value));
    };

    return (
      <Input
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="xxx-xxx-xxxx"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
