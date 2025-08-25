import React, { useRef } from "react";
import { View, TextInput, StyleSheet, TextInputProps } from "react-native";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: any;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  style,
}: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  React.useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;

    const newValue = value.split("");
    newValue[index] = digit;
    const newOtp = newValue.join("");
    onChange(newOtp);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    e: { nativeEvent: { key: string } }
  ) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.nativeEvent.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.nativeEvent.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: any) => {
    // Handle paste if needed
    const pastedData = e.clipboardData?.getData("text/plain")?.trim() || "";
    if (!/^\d+$/.test(pastedData)) return;
    if (pastedData.length === length) {
      onChange(pastedData);
      inputRefs.current[length - 1]?.focus();
    } else if (pastedData.length < length) {
      const newValue = value.split("");
      for (let i = 0; i < pastedData.length && i < length; i++) {
        newValue[i] = pastedData[i];
      }
      onChange(newValue.join(""));
      inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length }, (_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el as TextInput;
          }}
          keyboardType="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChangeText={(text) => handleChange(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e as any)}
          editable={!disabled}
          style={styles.input}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  input: {
    width: 48,
    height: 48,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "white",
  },
});