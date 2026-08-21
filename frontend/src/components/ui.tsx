import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, R, SP, shadow } from "@/src/theme";

// ------------------------------------------------------------------ Button
export function Btn({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  small,
  icon,
  testID,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "danger" | "success" | "ghost" | "dark";
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary" ? C.primary
    : variant === "danger" ? C.error
    : variant === "success" ? C.success
    : variant === "dark" ? C.dark
    : "transparent";
  const fg = variant === "outline" ? C.primary : variant === "ghost" ? C.text2 : C.white;
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        st.btn,
        small && st.btnSmall,
        { backgroundColor: bg, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: C.primary },
        variant === "ghost" && { borderWidth: 1, borderColor: C.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Ionicons name={icon as any} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={[st.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------ Card
export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[st.card, style]}>
      {children}
    </View>
  );
}

// ------------------------------------------------------------------ Badge
export function Badge({ text, color, bg, testID }: { text: string; color: string; bg: string; testID?: string }) {
  return (
    <View testID={testID} style={[st.badge, { backgroundColor: bg }]}>
      <Text style={[st.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Field
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  testID,
  maxLength,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  testID?: string;
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: SP.md }}>
      {label ? <Text style={st.fieldLabel}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[st.input, multiline && { height: 96, textAlignVertical: "top", paddingTop: 12 }]}
      />
    </View>
  );
}

// ------------------------------------------------------------------ Bottom Sheet (Modal based)
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.sheetOverlay} onPress={onClose} testID="sheet-overlay" />
      <View style={[st.sheet, { paddingBottom: insets.bottom + SP.lg }]}>
        <View style={st.sheetHandle} />
        {title ? <Text style={st.sheetTitle}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

// ------------------------------------------------------------------ Stars
export function Stars({
  value,
  onChange,
  size = 28,
  testID,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  testID?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }} testID={testID}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} disabled={!onChange} onPress={() => onChange?.(i)} testID={testID ? `${testID}-${i}` : undefined}>
          <Ionicons name={i <= value ? "star" : "star-outline"} size={size} color={i <= value ? "#F59E0B" : C.borderStrong} />
        </Pressable>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ Avatar
export function Avatar({ uri, size = 44, name }: { uri?: string | null; size?: number; name?: string }) {
  if (!uri) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.primaryDark, fontWeight: "700", fontSize: size / 2.5 }}>{(name || "?").charAt(0)}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
}

// ------------------------------------------------------------------ Empty state
export function Empty({ icon = "file-tray-outline", text, testID }: { icon?: string; text: string; testID?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: SP.xxl }} testID={testID}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg3, alignItems: "center", justifyContent: "center", marginBottom: SP.md }}>
        <Ionicons name={icon as any} size={32} color={C.text3} />
      </View>
      <Text style={{ color: C.text3, fontSize: 14, textAlign: "center", paddingHorizontal: SP.xl }}>{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Toast (global singleton)
type ToastMsg = { text: string; kind: "success" | "error" | "info" };
let _showToast: ((m: ToastMsg) => void) | null = null;

export function toast(text: string, kind: "success" | "error" | "info" = "info") {
  _showToast?.({ text, kind });
}

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<any>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    _showToast = (m) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 3200);
    };
    return () => {
      _showToast = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  if (!msg) return null;
  const bg = msg.kind === "success" ? C.success : msg.kind === "error" ? C.error : C.dark;
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      style={[st.toast, { top: insets.top + 8, backgroundColor: bg }]}
      pointerEvents="none"
      testID="toast"
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13, flexShrink: 1 }}>{msg.text}</Text>
    </Animated.View>
  );
}

// ------------------------------------------------------------------ Section title
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
      <Text style={st.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={{ color: bold ? C.text : C.text3, fontSize: bold ? 15 : 13.5, fontWeight: bold ? "700" : "400", flexShrink: 1 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: bold ? 15 : 13.5, fontWeight: bold ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

export const AnimatedCard = ({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) => (
  <Animated.View entering={FadeInDown.duration(320).delay(delay)} style={style}>
    {children}
  </Animated.View>
);

const st = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.lg,
    flexDirection: "row",
  },
  btnSmall: { minHeight: 40, paddingHorizontal: SP.md, borderRadius: R.sm + 2 },
  btnText: { fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    padding: SP.lg,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11.5, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: C.text2, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    height: 48,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.bg,
  },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.5)" },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    paddingHorizontal: SP.lg,
    paddingTop: SP.sm,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginVertical: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: SP.md },
  toast: {
    position: "absolute",
    left: SP.lg,
    right: SP.lg,
    borderRadius: R.md,
    paddingHorizontal: SP.lg,
    paddingVertical: 12,
    zIndex: 9999,
    ...shadow,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: C.text },
});
