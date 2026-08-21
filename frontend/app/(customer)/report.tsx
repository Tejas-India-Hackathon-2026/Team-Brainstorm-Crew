import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api, fileUrl, uploadImage } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { Btn, Field, toast } from "@/src/components/ui";

export default function ReportProblem() {
  const params = useLocalSearchParams<{ category?: string; priority?: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [category, setCategory] = useState<string>(params.category || "");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; path?: string; uploading: boolean }[]>([]);
  const [priority, setPriority] = useState(params.priority === "1");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    api<any[]>("/services").then(setServices).catch(() => {});
  }, []);
  useEffect(() => {
    if (params.category) setCategory(params.category);
    if (params.priority === "1") setPriority(true);
  }, [params.category, params.priority]);

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast(lang === "en" ? "Camera permission needed to take photos of the problem" : "समस्या की फ़ोटो लेने के लिए कैमरा अनुमति चाहिए", "error");
          return;
        }
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5, allowsMultipleSelection: true, selectionLimit: 3 });
      if (result.canceled) return;
      for (const asset of result.assets.slice(0, 3 - photos.length)) {
        const entry = { uri: asset.uri, uploading: true };
        setPhotos((p) => [...p, entry]);
        try {
          const path = await uploadImage(asset.uri, asset.fileName || "problem.jpg", asset.mimeType || "image/jpeg");
          setPhotos((p) => p.map((x) => (x.uri === asset.uri ? { ...x, path, uploading: false } : x)));
        } catch {
          setPhotos((p) => p.filter((x) => x.uri !== asset.uri));
          toast(lang === "en" ? "Photo upload failed" : "फ़ोटो अपलोड विफल", "error");
        }
      }
    } catch {
      toast("Could not open picker", "error");
    }
  };

  const submit = async () => {
    if (!category) {
      toast(lang === "en" ? "Please select a category" : "कृपया श्रेणी चुनें", "error");
      return;
    }
    if (!text.trim() && photos.filter((p) => p.path).length === 0) {
      toast(lang === "en" ? "Describe the problem or add a photo" : "समस्या लिखें या फ़ोटो जोड़ें", "error");
      return;
    }
    setAnalyzing(true);
    try {
      const report = await api<any>("/problem-reports", {
        method: "POST",
        body: { category, text: text.trim(), media_paths: photos.filter((p) => p.path).map((p) => p.path), priority },
      });
      await api(`/problem-reports/${report.id}/analyze`, { method: "POST" });
      router.push(`/customer/analysis/${report.id}` as any);
      setText("");
      setPhotos([]);
      setPriority(false);
    } catch (e: any) {
      toast(e?.message || "Failed to analyze", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.headerTitle}>{t("reportProblem")}</Text>
        <Text style={st.headerSub}>{lang === "en" ? "Our AI will diagnose it instantly" : "हमारा AI तुरंत जांच करेगा"}</Text>
      </View>

      {analyzing ? (
        <View style={st.analyzeWrap} testID="ai-analyzing-view">
          <View style={st.analyzeIcon}>
            <Ionicons name="sparkles" size={36} color={C.primary} />
          </View>
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: SP.lg }} />
          <Text style={st.analyzeText}>{t("analyzing")}</Text>
          <Text style={st.analyzeSub}>{lang === "en" ? "Detecting problem • Estimating cost • Checking safety" : "समस्या की पहचान • लागत अनुमान • सुरक्षा जांच"}</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 140 }} bottomOffset={80}>
          {/* Category chips */}
          <Text style={st.label}>{t("selectCategory")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 56 }} contentContainerStyle={{ gap: 8, paddingRight: SP.lg, alignItems: "center" }}>
            {services.map((s) => (
              <Pressable
                key={s.id}
                testID={`report-category-${s.id}`}
                onPress={() => setCategory(s.id)}
                style={[st.chip, category === s.id && st.chipActive]}
              >
                <Ionicons name={s.icon as any} size={15} color={category === s.id ? "#fff" : s.color} />
                <Text style={[st.chipText, category === s.id && { color: "#fff" }]}>{lang === "hi" ? s.name_hi : s.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ height: SP.lg }} />
          <Field
            label={t("describeProblem")}
            value={text}
            onChangeText={setText}
            placeholder={t("problemPlaceholder")}
            multiline
            maxLength={500}
            testID="report-text-input"
          />

          {/* Photos */}
          <Text style={st.label}>{t("addPhotos")}</Text>
          <View style={{ flexDirection: "row", gap: SP.sm, flexWrap: "wrap" }}>
            {photos.map((p, i) => (
              <View key={p.uri} style={st.photo}>
                <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%", borderRadius: R.sm }} contentFit="cover" />
                {p.uploading && (
                  <View style={st.photoOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
                <Pressable testID={`remove-photo-${i}`} onPress={() => setPhotos((ph) => ph.filter((x) => x.uri !== p.uri))} style={st.photoX}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < 3 && (
              <>
                <Pressable testID="add-photo-camera" onPress={() => pickPhoto(true)} style={st.addPhoto}>
                  <Ionicons name="camera" size={22} color={C.primary} />
                  <Text style={st.addPhotoText}>{lang === "en" ? "Camera" : "कैमरा"}</Text>
                </Pressable>
                <Pressable testID="add-photo-gallery" onPress={() => pickPhoto(false)} style={st.addPhoto}>
                  <Ionicons name="images" size={22} color={C.primary} />
                  <Text style={st.addPhotoText}>{lang === "en" ? "Gallery" : "गैलरी"}</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Priority */}
          <View style={st.priorityRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: C.text }}>{t("priorityReq")}</Text>
                <Text style={{ fontSize: 11, color: C.text3 }}>{lang === "en" ? "Priority matching, faster response" : "प्राथमिकता मैचिंग, तेज़ प्रतिक्रिया"}</Text>
              </View>
            </View>
            <Switch testID="priority-switch" value={priority} onValueChange={setPriority} trackColor={{ true: C.warning }} />
          </View>

          <View style={{ height: SP.xl }} />
          <Btn testID="analyze-btn" title={t("analyzeBtn")} icon="sparkles" onPress={submit} />
          <Text style={st.note}>
            {lang === "en"
              ? "AI analysis is for reference only. Final diagnosis will be done by the professional."
              : "AI विश्लेषण केवल संदर्भ के लिए है। अंतिम जांच प्रोफेशनल करेंगे।"}
          </Text>
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.text },
  headerSub: { fontSize: 12, color: C.text3, marginTop: 2 },
  label: { fontSize: 13, fontWeight: "600", color: C.text2, marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: R.pill,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12.5, fontWeight: "600", color: C.text2 },
  photo: { width: 84, height: 84, borderRadius: R.sm, overflow: "hidden" },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  photoX: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 84, height: 84, borderRadius: R.sm, borderWidth: 1.5, borderColor: "#BFDBFE", borderStyle: "dashed", backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoText: { fontSize: 10.5, color: C.primary, fontWeight: "600" },
  priorityRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: R.md, padding: SP.md, marginTop: SP.lg, borderWidth: 1, borderColor: "#FDE68A" },
  note: { fontSize: 11, color: C.text3, textAlign: "center", marginTop: SP.md, paddingHorizontal: SP.lg },
  analyzeWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SP.xl },
  analyzeIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  analyzeText: { fontSize: 16, fontWeight: "800", color: C.text, marginTop: SP.lg, textAlign: "center" },
  analyzeSub: { fontSize: 12, color: C.text3, marginTop: 6, textAlign: "center" },
});
