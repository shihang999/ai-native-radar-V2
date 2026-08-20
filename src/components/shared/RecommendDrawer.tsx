"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DOMAINS, RINGS, type RecommendationRating } from "@/lib/constants";
import { showToast } from "./Toast";
import type {
  FieldConfidence,
  InputMode,
  ParsedRecommendationItem,
  ParseRecommendationOutput,
  ResourceType,
} from "@/lib/ai/types";
import { RESOURCE_TYPES } from "@/lib/ai/types";
import {
  OPEN_RECOMMEND_DRAWER_EVENT,
  type OpenRecommendDrawerDetail,
} from "@/lib/recommendation-drawer";

type Stage = "mode" | "preview" | "success";

interface FormItem {
  id: string;
  title: string;
  author?: string | null;
  resource_type: ResourceType;
  resource_url?: string | null;
  domain_id: string;
  ring_id: "beginner" | "intermediate" | "advanced";
  rating: RecommendationRating | "";
  reason: string;
  confidence?: FieldConfidence | null;
  raw_source_excerpt?: string | null;
  is_new_blank?: boolean;
  linked_resource_id?: string | null;
}

const emptyForm = (): FormItem => ({
  id: cryptoId(),
  title: "",
  author: null,
  resource_type: "book",
  resource_url: null,
  domain_id: "",
  ring_id: "beginner",
  rating: "",
  reason: "",
  is_new_blank: true,
});

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MODE_META: Array<{ key: InputMode; title: string; desc: string; icon: string }> = [
  {
    key: "text",
    title: "粘贴文本",
    desc: "粘贴微信/飞书/书评里的推荐内容，一次多本都 OK",
    icon: "📝",
  },
  {
    key: "image",
    title: "上传图片",
    desc: "聊天截图、书单、手写拍照都可以，自动识别文字和推荐",
    icon: "🖼️",
  },
  {
    key: "voice",
    title: "语音录入",
    desc: "直接口述推荐，适合群聊、会议场景，60 秒以内",
    icon: "🎙️",
  },
];

export function RecommendDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("mode");
  const [mode, setMode] = useState<InputMode>("text");
  const [showManualForm, setShowManualForm] = useState(false);

  const [rawText, setRawText] = useState("");
  const [images, setImages] = useState<Array<{ mime: "image/png" | "image/jpeg" | "image/webp"; data_base64: string; name?: string }>>([]);
  const audioRecordingRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parseOutput, setParseOutput] = useState<ParseRecommendationOutput | null>(null);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [recommender, setRecommender] = useState("");
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [reviewingExisting, setReviewingExisting] = useState(false);

  // 原手工表单字段兜底
  const [manualForm, setManualForm] = useState<ManualFormValue>({
    title: "",
    resource_type: "book",
    resource_url: "",
    domain_id: "",
    ring_id: "beginner",
    rating: "",
    reason: "",
    recommender: "",
  });

  // 监听全局事件 & URL query 打开
  useEffect(() => {
    const handleOpenDrawer = (event: Event) => {
      const detail = event instanceof CustomEvent
        ? event.detail as OpenRecommendDrawerDetail | undefined
        : undefined;
      openDrawer(detail);
    };
    window.addEventListener(OPEN_RECOMMEND_DRAWER_EVENT, handleOpenDrawer);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "recommend") {
      openDrawer();
    }
    return () => window.removeEventListener(OPEN_RECOMMEND_DRAWER_EVENT, handleOpenDrawer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDrawer(detail?: OpenRecommendDrawerDetail) {
    const existingResource = detail?.intent === "review-existing" ? detail.resource : null;
    setIsOpen(true);
    setStage(existingResource ? "preview" : "mode");
    setMode("text");
    setShowManualForm(false);
    setRawText("");
    setImages([]);
    setAudioBlob(null);
    setAudioDurationSec(null);
    stopRecordingIfAny();
    setParsing(false);
    setSubmitting(false);
    setParseOutput(null);
    setFormItems(existingResource ? [{
      id: cryptoId(),
      title: existingResource.title,
      author: existingResource.author,
      resource_type: existingResource.resource_type,
      resource_url: existingResource.resource_url,
      domain_id: existingResource.domain_id,
      ring_id: RINGS.some((ring) => ring.id === existingResource.ring_id)
        ? existingResource.ring_id as FormItem["ring_id"]
        : "beginner",
      rating: "",
      reason: "",
      linked_resource_id: existingResource.id,
    }] : []);
    setRecommender("");
    setFriendlyError(null);
    setReviewingExisting(!!existingResource);
    setManualForm({
      title: "",
      resource_type: "book",
      resource_url: "",
      domain_id: "",
      ring_id: "beginner",
      rating: "",
      reason: "",
      recommender: "",
    });
  }

  function handleClose() {
    setIsOpen(false);
    setReviewingExisting(false);
    stopRecordingIfAny();
  }

  // ===== 解析 =====
  async function handleParse(): Promise<void> {
    setFriendlyError(null);
    if (mode === "text") {
      if (!rawText.trim()) {
        setFriendlyError("请粘贴一段推荐内容再解析");
        return;
      }
    } else if (mode === "image") {
      if (images.length === 0) {
        setFriendlyError("请至少上传或粘贴一张图片");
        return;
      }
      if (images.length > 3) {
        setFriendlyError("一次最多解析 3 张图片");
        return;
      }
    } else if (mode === "voice") {
      if (!audioBlob) {
        setFriendlyError("请先录制或上传一段语音");
        return;
      }
      if (audioDurationSec != null && audioDurationSec > 60) {
        setFriendlyError("语音超过 60 秒，请重新录制");
        return;
      }
    }

    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("mode", mode);
      if (mode === "text") {
        fd.append("raw_text", rawText);
      } else if (mode === "image") {
        images.forEach((img, i) => {
          fd.append(`images_mime[${i}]`, img.mime);
          const blob = b64toBlob(img.data_base64, img.mime);
          fd.append(`images[${i}]`, blob, img.name ?? `image-${i}.${img.mime.split("/")[1]}`);
        });
      } else if (mode === "voice") {
        if (!audioBlob) {
          setFriendlyError("请先录制或上传一段语音");
          setParsing(false);
          return;
        }
        const mime = audioBlob.type || "audio/mpeg";
        fd.append("audio_mime", mime);
        if (audioDurationSec != null) fd.append("duration_seconds", String(audioDurationSec));
        fd.append("audio_file", audioBlob, "voice-recommendation.blob");
      }

      const res = await fetch("/api/ai/parse-recommendation-input", { method: "POST", body: fd });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as ParseRecommendationOutput;
      setParseOutput(data);
      const ok = data.parse_status === "success" && Array.isArray(data.items) && data.items.length > 0;
      if (!ok) {
        setFriendlyError(data.error?.user_message ?? "没识别出可推荐的资料，请换一种方式录入或直接手工填写");
        // 依然跳 preview：让用户从空卡片开始填
        const itemsFromEmpty: FormItem[] = data.items && data.items.length > 0
          ? data.items.map(convertItemToForm)
          : [emptyForm()];
        setFormItems(itemsFromEmpty);
      } else {
        setFormItems(data.items.map(convertItemToForm));
      }
      setStage("preview");
    } catch (err) {
      showToast("解析失败，请稍后重试", "error");
      setFriendlyError("解析服务暂时不可用，请稍后再试或改用手工填写");
    } finally {
      setParsing(false);
    }
  }

  // ===== 提交 =====
  async function handleSubmitBatch(): Promise<void> {
    setFriendlyError(null);
    if (submitting) return;
    const cleaned = formItems.map(sanitizeFormItem);
    const failMsgs: string[] = [];
    cleaned.forEach((it, idx) => {
      if (!it.title) failMsgs.push(`第 ${idx + 1} 条：请填写资料名称`);
      if (!it.domain_id) failMsgs.push(`第 ${idx + 1} 条：请选择领域`);
      if (!it.ring_id) failMsgs.push(`第 ${idx + 1} 条：请选择学习阶段`);
      if (!it.rating) failMsgs.push(`第 ${idx + 1} 条：请选择推荐指数`);
      if (!it.reason || it.reason.trim().length < 5) failMsgs.push(`第 ${idx + 1} 条：推荐理由至少 5 个字`);
    });
    if (failMsgs.length > 0) {
      setFriendlyError(failMsgs.slice(0, 3).join("\n"));
      return;
    }
    setSubmitting(true);
    try {
      const bodyPayload = {
        items: cleaned.map((it) => ({
          title: it.title!,
          author: it.author ?? null,
          resource_type: it.resource_type,
          resource_url: it.resource_url && /^https?:\/\//.test(it.resource_url) ? it.resource_url : null,
          domain_id: it.domain_id!,
          ring_id: it.ring_id!,
          rating: it.rating! as RecommendationRating,
          reason: it.reason!,
          ai_confidence: it.confidence ?? null,
          raw_source_excerpt: it.raw_source_excerpt ?? null,
          linked_resource_id: it.linked_resource_id ?? null,
        })),
        input_mode: reviewingExisting || showManualForm ? "manual" : mode,
        source: reviewingExisting || showManualForm ? "manual" : "ai_parsed",
        recommender_name: recommender.trim() || null,
        raw_text_snapshot: reviewingExisting
          ? null
          : mode === "text" ? rawText : parseOutput?.raw_extracted_text ?? null,
        ocr_text_snapshot: reviewingExisting ? null : parseOutput?.ocr_text_snapshot ?? null,
        audio_metadata: reviewingExisting ? null : parseOutput?.audio_metadata ?? null,
      };
      const res = await fetch("/api/recommendations/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = (await res.json()) as { success: boolean; error?: string; success_count?: number };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "提交失败");
      }
      setStage("success");
      showToast(
        reviewingExisting
          ? "评价提交成功，审核后将补充到这本书的推荐信息"
          : `已提交 ${data.success_count ?? 1} 条推荐，等待审核后将进入雷达`,
        "success",
      );
      setTimeout(() => handleClose(), 2500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "提交失败，请稍后重试", "error");
      setFriendlyError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  // 原手工表单提交（兜底）
  async function handleSubmitManual(): Promise<void> {
    setFriendlyError(null);
    if (!manualForm.title.trim()) return setFriendlyError("请填写资料名称");
    if (!manualForm.domain_id) return setFriendlyError("请选择领域");
    if (!manualForm.ring_id) return setFriendlyError("请选择学习阶段");
    if (!manualForm.rating) return setFriendlyError("请选择推荐指数");
    if (manualForm.reason.trim().length < 5) return setFriendlyError("推荐理由至少 5 个字");

    const urlValid = manualForm.resource_url ? /^https?:\/\//.test(manualForm.resource_url) : true;
    if (!urlValid) return setFriendlyError("请填写有效的资料链接（http/https）");

    setSubmitting(true);
    try {
      const payload = {
        items: [{
          title: manualForm.title.trim(),
          author: null,
          resource_type: manualForm.resource_type,
          resource_url: manualForm.resource_url.trim() || null,
          domain_id: manualForm.domain_id,
          ring_id: manualForm.ring_id,
          rating: manualForm.rating,
          reason: manualForm.reason.trim(),
        }],
        input_mode: "manual" as const,
        source: "manual" as const,
        recommender_name: manualForm.recommender.trim() || null,
      };
      const res = await fetch("/api/recommendations/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; error?: string; duplicate?: unknown };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "提交失败");
      }
      setStage("success");
      showToast("推荐提交成功！等待审核后将进入雷达", "success");
      setTimeout(() => handleClose(), 2500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "提交失败，请稍后重试", "error");
      setFriendlyError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== 图片处理 =====
  function acceptImageFiles(files: FileList | File[]): void {
    const list = Array.from(files);
    list.forEach((f) => {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = String(reader.result ?? "").split(",")[1] ?? "";
        const mime = f.type === "image/jpg" ? "image/jpeg" : (f.type as "image/png" | "image/jpeg" | "image/webp");
        setImages((prev) => [...prev, { mime, data_base64: b64, name: f.name }]);
      };
      reader.readAsDataURL(f);
    });
  }

  // ===== 录音处理 =====
  function startRecording(): void {
    if (typeof window === "undefined" || !("navigator" in window) || !navigator.mediaDevices?.getUserMedia) {
      setFriendlyError("当前浏览器不支持录音权限，请改用粘贴文本或上传图片");
      return;
    }
    setFriendlyError(null);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const preferredMimeTypes = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
      const mimeType = preferredMimeTypes.find((item) => MediaRecorder.isTypeSupported(item));
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioRecordingRef.current = mr;
      audioChunksRef.current = [];
      setRecordingElapsed(0);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioDurationSec(Math.max(1, recordingElapsed));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecordingTimer(window.setInterval(() => {
        setRecordingElapsed((e) => {
          const next = e + 1;
          if (next >= 60) {
            stopRecordingIfAny();
          }
          return next;
        });
      }, 1000));
    }).catch(() => {
      setFriendlyError("未获取到麦克风权限，请在浏览器设置中允许录音");
    });
  }

  function stopRecordingIfAny(): void {
    if (recordingTimer != null) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    const mr = audioRecordingRef.current;
    if (mr && mr.state !== "inactive") {
      try { mr.stop(); } catch { /* ignore */ }
    }
    audioRecordingRef.current = null;
  }

  // ===== 预览卡片操作 =====
  function updateItem(id: string, patch: Partial<FormItem>): void {
    setFormItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  }
  function removeItem(id: string): void {
    setFormItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.id !== id)));
  }
  function addBlankItem(): void {
    setFormItems((prev) => prev.length >= 10 ? prev : [...prev, emptyForm()]);
  }

  // ===== 渲染 =====
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex h-full flex-col">
        <DrawerHeader
          title={
            stage === "mode"
              ? showManualForm ? "手工推荐一本书" : "AI 智能录入"
              : stage === "preview"
                ? reviewingExisting
                  ? "评价这本书"
                  : "预览并确认推荐"
                : reviewingExisting
                  ? "已收到你的评价"
                  : "已收到你的推荐"
          }
          onClose={handleClose}
          steps={stage}
          showManual={showManualForm}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {friendlyError && (
            <div className="mb-6 whitespace-pre-line rounded-lg border border-[#EF4444] bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
              {friendlyError}
            </div>
          )}

          {stage === "mode" && !showManualForm && (
            <ModePanel
              mode={mode}
              setMode={setMode}
              rawText={rawText}
              setRawText={setRawText}
              images={images}
              setImages={setImages}
              acceptImageFiles={acceptImageFiles}
              recordingElapsed={recordingElapsed}
              audioBlob={audioBlob}
              audioDurationSec={audioDurationSec}
              setAudioBlob={setAudioBlob}
              startRecording={startRecording}
              stopRecording={stopRecordingIfAny}
              onParse={handleParse}
              parsing={parsing}
              onJumpToManual={() => setShowManualForm(true)}
            />
          )}

          {stage === "mode" && showManualForm && (
            <ManualFormPanel
              value={manualForm}
              setValue={setManualForm}
              onSubmit={handleSubmitManual}
              submitting={submitting}
              onSwitchBack={() => setShowManualForm(false)}
            />
          )}

          {stage === "preview" && (
            <PreviewPanel
              items={formItems}
              updateItem={updateItem}
              removeItem={removeItem}
              addBlankItem={addBlankItem}
              recommender={recommender}
              setRecommender={setRecommender}
              onBack={reviewingExisting ? handleClose : () => setStage("mode")}
              onSubmit={handleSubmitBatch}
              submitting={submitting}
              reviewingExisting={reviewingExisting}
            />
          )}

          {stage === "success" && (
            <SuccessPanel
              hasName={!!recommender.trim()}
              reviewingExisting={reviewingExisting}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 子组件
// ================================================================

function DrawerHeader(props: {
  title: string;
  onClose: () => void;
  steps: Stage;
  showManual: boolean;
}) {
  return (
    <div className="border-b border-[#E2E8F0] px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[#10213E]">{props.title}</h2>
        <button
          type="button"
          onClick={props.onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6]"
          aria-label="关闭"
        >
          <svg className="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2 flex w-full items-center text-xs text-[#64748B]">
        <StepDot active={props.steps === "mode" || props.showManual} label="录入" />
        <span className="mx-2 h-px flex-1 bg-[#CBD5E1]" />
        <StepDot active={props.steps === "preview"} label="预览" />
        <span className="mx-2 h-px flex-1 bg-[#CBD5E1]" />
        <StepDot active={props.steps === "success"} label="推荐成功" />
      </div>
    </div>
  );
}

function StepDot(props: { active?: boolean; label: string }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 " +
        (props.active ? "bg-[#5DB2E2]/10 text-[#5DB2E2]" : "bg-[#F1F5F9] text-[#94A3B8]")
      }
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (props.active ? "bg-[#5DB2E2]" : "bg-[#94A3B8]")} />
      {props.label}
    </span>
  );
}

type ImageItem = { mime: "image/png" | "image/jpeg" | "image/webp"; data_base64: string; name?: string };

function canParseMode(mode: InputMode, rawText: string, images: ImageItem[], audioBlob: Blob | null): boolean {
  if (mode === "text") return rawText.trim().length > 0;
  if (mode === "image") return images.length > 0;
  if (mode === "voice") return !!audioBlob;
  return false;
}

function ModePanel(props: {
  mode: InputMode;
  setMode: (m: InputMode) => void;
  rawText: string;
  setRawText: React.Dispatch<React.SetStateAction<string>>;
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  acceptImageFiles: (files: FileList | File[]) => void;
  recordingElapsed: number;
  audioBlob: Blob | null;
  audioDurationSec: number | null;
  setAudioBlob: (b: Blob | null) => void;
  startRecording: () => void;
  stopRecording: () => void;
  onParse: () => void;
  parsing: boolean;
  onJumpToManual: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canParse = canParseMode(props.mode, props.rawText, props.images, props.audioBlob);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgList: File[] = [];
      const textPromises: Array<Promise<string>> = [];
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) imgList.push(f);
        } else if (it.kind === "string" && it.type === "text/plain") {
          textPromises.push(new Promise<string>((resolve) => it.getAsString(resolve)));
        }
      }
      if (imgList.length > 0) {
        e.preventDefault();
        props.acceptImageFiles(imgList);
        props.setMode("image");
        return;
      }
      if (textPromises.length > 0) {
        e.preventDefault();
        Promise.all(textPromises).then((chunks) => {
          const joined = chunks.join("\n").trim();
          if (joined.length === 0) return;
          props.setRawText((prev: string) => (prev ? prev + "\n" + joined : joined));
          props.setMode("text");
        });
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {MODE_META.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => props.setMode(m.key)}
            className={
              "flex items-start gap-3 rounded-xl border p-4 text-left transition " +
              (props.mode === m.key
                ? "border-[#5DB2E2] bg-[#5DB2E2]/5"
                : "border-[#E2E8F0] hover:border-[#5DB2E2]/60")
            }
          >
            <span className="text-2xl leading-none">{m.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#10213E]">{m.title}</div>
              <div className="mt-0.5 text-xs text-[#64748B]">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {props.mode === "text" && (
        <div>
          <textarea
            rows={8}
            value={props.rawText}
            onChange={(e) => props.setRawText(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
            placeholder={
              "例如：\n团队新人入门先看《深度学习入门》和《动手学深度学习》，AI 基础领域，入门；做产品落地可以看《AI 产品经理实战》，进阶，产品应用。"
            }
          />
          <p className="mt-2 text-xs text-[#94A3B8]">支持一次粘贴多本，AI 会自动拆分到预览页。</p>
        </div>
      )}

      {props.mode === "image" && (
        <div>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) props.acceptImageFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-10 text-center transition hover:border-[#5DB2E2] hover:bg-[#EFF6FF]"
          >
            <div className="text-3xl">🖼️</div>
            <div className="text-sm font-medium text-[#10213E]">点击、拖拽或 Ctrl+V 粘贴图片</div>
            <div className="text-xs text-[#94A3B8]">支持 PNG/JPG/WEBP，一次最多 3 张</div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) props.acceptImageFiles(e.target.files); }}
            />
          </div>
          {props.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {props.images.map((img, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-lg border border-[#E2E8F0]">
                  <img src={`data:${img.mime};base64,${img.data_base64}`} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => props.setImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                    aria-label="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {props.mode === "voice" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] p-5 text-center">
            <div className="mb-3 text-5xl leading-none">🎙️</div>
            <div className="text-sm text-[#10213E]">
              推荐：「建议新人先看 XXX，进阶再看 YYY」
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              {!props.audioBlob && (
                <button
                  type="button"
                  onClick={
                    props.recordingElapsed > 0
                      ? props.stopRecording
                      : props.startRecording
                  }
                  className={
                    "rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition " +
                    (props.recordingElapsed > 0
                      ? "bg-[#EF4444] hover:bg-[#DC2626]"
                      : "bg-[#5DB2E2] hover:bg-[#4A9FD8]")
                  }
                >
                  {props.recordingElapsed > 0 ? `停止录音（${props.recordingElapsed}s）` : "开始录音（最长 60 秒）"}
                </button>
              )}
              {props.audioBlob && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <audio controls src={URL.createObjectURL(props.audioBlob)} className="h-10 w-full max-w-sm" />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        props.setAudioBlob(null);
                      }}
                      className="text-xs text-[#64748B] underline hover:text-[#5DB2E2]"
                    >
                      重新录制
                    </button>
                    {props.audioDurationSec != null && (
                      <span className="text-xs text-[#94A3B8]">时长约 {props.audioDurationSec} 秒</span>
                    )}
                    <span className="text-xs text-[#94A3B8]">
                      · 浏览器录制格式，无需手动转码
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-[#94A3B8]">
            提示：对着麦克风说清楚书名和领域；解析失败也可以先跳到预览页，手工补全。
          </p>
        </div>
      )}

      <div className="rounded-lg border border-[#00524C]/20 bg-[#00524C]/5 p-4 text-xs text-[#00524C]/90">
        🔒 隐私说明：我们只会用你上传的内容做结构化解析，识别后原始图片/语音会立即删除，不做其他用途。
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={props.onJumpToManual}
          className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F5F6]"
        >
          我想手工填
        </button>
        <button
          type="button"
          onClick={props.onParse}
          disabled={props.parsing || !canParse}
          title={canParse ? "" : props.mode === "text" ? "请先粘贴推荐内容" : props.mode === "image" ? "请先上传或粘贴图片" : "请先录制一段语音"}
          className="flex-1 rounded-lg bg-[#5DB2E2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.parsing
            ? "解析中…请稍候"
            : canParse
              ? "AI 解析并预览"
              : props.mode === "text"
                ? "请先粘贴推荐内容"
                : props.mode === "image"
                  ? "请先上传或粘贴图片"
                  : "请先录制一段语音"}
        </button>
      </div>
    </div>
  );
}

type ManualFormValue = {
  title: string;
  resource_type: ResourceType;
  resource_url: string;
  domain_id: string;
  ring_id: "beginner" | "intermediate" | "advanced";
  rating: RecommendationRating | "";
  reason: string;
  recommender: string;
};

function ManualFormPanel(props: {
  value: ManualFormValue;
  setValue: React.Dispatch<React.SetStateAction<ManualFormValue>>;
  onSubmit: () => void;
  submitting: boolean;
  onSwitchBack: () => void;
}) {
  const v = props.value;
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); props.onSubmit(); }}>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">资料名称 <span className="text-[#E63946]">*</span></label>
        <input
          type="text"
          value={v.title}
          onChange={(e) => props.setValue({ ...v, title: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
          placeholder="例如：深度学习入门"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">资料类型 <span className="text-[#E63946]">*</span></label>
        <div className="flex gap-3">
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => props.setValue({ ...v, resource_type: t })}
              className={
                "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition " +
                (v.resource_type === t
                  ? "border-[#5DB2E2] bg-[#5DB2E2]/10 text-[#5DB2E2]"
                  : "border-[#E2E8F0] text-[#64748B] hover:border-[#5DB2E2] hover:text-[#5DB2E2]")
              }
            >
              {t === "book" ? "书籍" : t === "course" ? "课程" : "文章"}
            </button>
          ))}
        </div>
      </div>
      {(v.resource_type === "course" || v.resource_type === "article") && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[#10213E]">资料链接 <span className="text-[#E63946]">*</span></label>
          <input
            type="url"
            value={v.resource_url}
            onChange={(e) => props.setValue({ ...v, resource_url: e.target.value })}
            className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
            placeholder="https://example.com/resource"
          />
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">领域 <span className="text-[#E63946]">*</span></label>
        <select
          value={v.domain_id}
          onChange={(e) => props.setValue({ ...v, domain_id: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
        >
          <option value="">请选择领域</option>
          {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">学习阶段 <span className="text-[#E63946]">*</span></label>
        <div className="flex gap-3">
          {RINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => props.setValue({ ...v, ring_id: r.id as ManualFormValue["ring_id"] })}
              className={
                "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition " +
                (v.ring_id === r.id
                  ? "border-[#5DB2E2] bg-[#5DB2E2]/10 text-[#5DB2E2]"
                  : "border-[#E2E8F0] text-[#64748B] hover:border-[#5DB2E2] hover:text-[#5DB2E2]")
              }
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">推荐指数 <span className="text-[#E63946]">*</span></label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => props.setValue({ ...v, rating: star as RecommendationRating })}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6]"
            >
              <svg
                className={"h-6 w-6 " + (v.rating && v.rating >= star ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#E2E8F0]")}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">推荐理由 <span className="text-[#E63946]">*</span></label>
        <textarea
          rows={4}
          value={v.reason}
          onChange={(e) => props.setValue({ ...v, reason: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
          placeholder="请说明推荐理由，至少 5 字"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#10213E]">推荐人（可选）</label>
        <input
          type="text"
          value={v.recommender}
          onChange={(e) => props.setValue({ ...v, recommender: e.target.value })}
          className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
          placeholder="留名将在审核通过后展示在资源详情页"
        />
      </div>
      <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={props.onSwitchBack}
          className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F5F6]"
        >
          用智能录入
        </button>
        <button
          type="submit"
          disabled={props.submitting}
          className="flex-1 rounded-lg bg-[#5DB2E2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8] disabled:opacity-60"
        >
          {props.submitting ? "提交中…" : "提交推荐"}
        </button>
      </div>
    </form>
  );
}

function PreviewPanel(props: {
  items: FormItem[];
  updateItem: (id: string, patch: Partial<FormItem>) => void;
  removeItem: (id: string) => void;
  addBlankItem: () => void;
  recommender: string;
  setRecommender: (s: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  reviewingExisting: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#5DB2E2]/30 bg-[#5DB2E2]/5 p-4 text-sm text-[#10213E]">
        {props.reviewingExisting ? (
          <>
            书籍信息已自动填好。请选择你的推荐指数，并写下至少 5 个字的评价理由；提交后将进入人工审核。
          </>
        ) : (
          <>
            💡 AI 已帮你拆成可提交的书单。<b>所有字段都可以直接改</b>，尤其检查：<span className="text-[#E63946]">标题、领域、学习阶段</span>。修改完再确认提交，将进入人工审核。
          </>
        )}
      </div>
      <div className="space-y-4">
        {props.items.map((it, idx) => (
          <PreviewCard
            key={it.id}
            index={idx}
            item={it}
            update={(patch) => props.updateItem(it.id, patch)}
            onRemove={() => props.removeItem(it.id)}
            canRemove={props.items.length > 1}
            metadataLocked={props.reviewingExisting}
          />
        ))}
      </div>
      {!props.reviewingExisting && (
        <button
          type="button"
          onClick={props.addBlankItem}
          disabled={props.items.length >= 10}
          className="w-full rounded-lg border border-dashed border-[#E2E8F0] bg-white py-3 text-sm text-[#64748B] transition hover:border-[#5DB2E2] hover:text-[#5DB2E2] disabled:opacity-60"
        >
          + 新增一本空白条目（最多 10 本）
        </button>
      )}

      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <label className="mb-1 block text-sm font-medium text-[#10213E]">想留个名字吗？（可选）</label>
        <input
          type="text"
          value={props.recommender}
          onChange={(e) => props.setRecommender(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
          placeholder="你的名字或昵称，留名将在审核通过后显示在资源详情页中~"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onBack}
          className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F5F6]"
        >
          {props.reviewingExisting ? "取消评价" : "← 返回重新粘贴"}
        </button>
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={props.submitting}
          className="flex-1 rounded-lg bg-[#5DB2E2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8] disabled:opacity-60"
        >
          {props.submitting
            ? "提交中…"
            : props.reviewingExisting
              ? "提交评价（进入人工审核）"
              : "确认提交（进入人工审核）"}
        </button>
      </div>
    </div>
  );
}

function PreviewCard(props: {
  index: number;
  item: FormItem;
  update: (patch: Partial<FormItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
  metadataLocked: boolean;
}) {
  const it = props.item;
  const low = (n?: number | null) => typeof n === "number" && n < 0.65;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] antialiased [text-rendering:optimizeLegibility]">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#5DB2E2]/10 px-2.5 py-1 text-xs font-semibold text-[#0369A1]">
          {props.metadataLocked ? "当前资源" : `第 ${props.index + 1} 本`}
          {it.is_new_blank && <span className="text-[#64748B]">（空白）</span>}
        </div>
        {!props.metadataLocked && (
          <button
            type="button"
            onClick={props.onRemove}
            disabled={!props.canRemove}
            className="text-xs font-medium text-[#64748B] transition hover:text-[#EF4444] disabled:opacity-40"
          >
            删除这本
          </button>
        )}
      </div>
      {it.is_new_blank && (
        <div className="mb-4 rounded-lg border border-dashed border-[#5DB2E2]/50 bg-[#5DB2E2]/5 px-3 py-2 text-[13px] leading-5 font-medium text-[#0369A1]">
          AI 未能自动拆出内容，请你直接在下面手工填写推荐书籍信息即可。
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        <FieldWithWarn label="标题" required warn={low(it.confidence?.title)}>
          <input
            type="text"
            value={it.title}
            onChange={(e) => props.update({ title: e.target.value })}
            disabled={props.metadataLocked}
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            placeholder="书名或课程/文章名称"
          />
        </FieldWithWarn>
        <div className="grid grid-cols-2 gap-4">
          <FieldWithWarn label="作者">
            <input
              type="text"
              value={it.author ?? ""}
              onChange={(e) => props.update({ author: e.target.value || null })}
              disabled={props.metadataLocked}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
              placeholder="未识别可留空"
            />
          </FieldWithWarn>
          <FieldWithWarn label="资料类型">
            <select
              value={it.resource_type}
              onChange={(e) => props.update({ resource_type: e.target.value as ResourceType })}
              disabled={props.metadataLocked}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "book" ? "书籍" : t === "course" ? "课程" : "文章"}
                </option>
              ))}
            </select>
          </FieldWithWarn>
        </div>
        <FieldWithWarn label="资料链接">
          <input
            type="url"
            value={it.resource_url ?? ""}
            onChange={(e) => props.update({ resource_url: e.target.value || null })}
            disabled={props.metadataLocked}
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            placeholder="https://...（可留空）"
          />
        </FieldWithWarn>
        <div className="grid grid-cols-2 gap-4">
          <FieldWithWarn label="所属领域" required warn={low(it.confidence?.domain_id)}>
            <select
              value={it.domain_id}
              onChange={(e) => props.update({ domain_id: e.target.value })}
              disabled={props.metadataLocked}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            >
              <option value="">请选择领域</option>
              {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FieldWithWarn>
          <FieldWithWarn label="学习阶段" required warn={low(it.confidence?.ring_id)}>
            <select
              value={it.ring_id}
              onChange={(e) => props.update({ ring_id: e.target.value as FormItem["ring_id"] })}
              disabled={props.metadataLocked}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            >
              {RINGS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </FieldWithWarn>
        </div>
        <FieldWithWarn label={props.metadataLocked ? "我的推荐指数" : "推荐指数"} required warn={low(it.confidence?.rating)}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => props.update({ rating: (it.rating === star ? "" : star) as FormItem["rating"] })}
                className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6]"
              >
                <svg
                  className={
                    "h-6 w-6 " +
                    (it.rating && it.rating >= star ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#CBD5E1]")
                  }
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
        </FieldWithWarn>
        <FieldWithWarn label={props.metadataLocked ? "我的评价理由" : "推荐理由"} required>
          <textarea
            rows={3}
            value={it.reason}
            onChange={(e) => props.update({ reason: e.target.value })}
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[15px] leading-6 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/25"
            placeholder={props.metadataLocked ? "写下你对这本书的评价，至少 5 个字" : "保留了你原文的推荐理由，可直接编辑；至少 5 个字"}
          />
        </FieldWithWarn>
        {it.raw_source_excerpt && (
          <details className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[13px] leading-6 text-[#334155]">
            <summary className="cursor-pointer font-medium text-[#475569]">🔍 原始摘录（供审核对照）</summary>
            <div className="mt-1 whitespace-pre-wrap">{it.raw_source_excerpt}</div>
          </details>
        )}
      </div>
    </div>
  );
}

function FieldWithWarn(props: { label: string; required?: boolean; warn?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] leading-5 font-semibold text-[#0F172A]">
        {props.label}
        {props.required && <span className="text-[#E63946]">*</span>}
        {props.warn && (
          <span title="AI 不太确定，建议核对" className="text-[#B45309] font-medium">⚠️ AI 低置信</span>
        )}
      </span>
      {props.children}
    </label>
  );
}

function SuccessPanel(props: { hasName: boolean; reviewingExisting: boolean }) {
  return (
    <div className="rounded-xl border border-[#00524C] bg-[#00524C]/5 p-5 text-sm text-[#00524C]">
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#00524C] text-white">✓</div>
        <div>
          <div className="font-semibold text-[#00524C]">
            {props.reviewingExisting ? "已收到你的评价，感谢分享！" : "已收到你的推荐，感谢共建！"}
          </div>
          <div className="mt-1 text-xs text-[#00524C]/80">
            {props.reviewingExisting
              ? "你的评价已进入审核队列，审核通过后将补充到这本书的推荐信息中。"
              : "你的推荐已进入审核队列，审核通过后将正式进入雷达。"}
            {props.hasName && (
              <span className="block">
                留名将在审核通过后，显示在资源详情页的「推荐人」位置。
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("openRecommendDrawer"))}
        className="mt-3 w-full rounded-lg bg-[#00524C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004540]"
      >
        继续再推荐一本
      </button>
    </div>
  );
}

// ================================================================
// 工具函数
// ================================================================
function convertItemToForm(p: ParsedRecommendationItem): FormItem {
  const ring =
    p.ring_id === "beginner" || p.ring_id === "intermediate" || p.ring_id === "advanced"
      ? p.ring_id
      : (RINGS[0]?.id ?? "beginner") as FormItem["ring_id"];
  const domain = DOMAINS.some((d) => d.id === p.domain_id) ? p.domain_id ?? "" : "";
  const rt = p.resource_type && RESOURCE_TYPES.includes(p.resource_type) ? p.resource_type : "book";
  const rating = p.rating && [1, 2, 3, 4, 5].includes(p.rating) ? p.rating : 4;
  return {
    id: cryptoId(),
    title: p.title ?? "",
    author: p.author ?? null,
    resource_type: rt,
    resource_url: p.resource_url ?? null,
    domain_id: domain,
    ring_id: ring as FormItem["ring_id"],
    rating: rating as RecommendationRating,
    reason: p.reason_summary || "未识别，请补充推荐理由",
    confidence: p.confidence ?? null,
    raw_source_excerpt: p.raw_source_excerpt ?? null,
  };
}

function sanitizeFormItem(it: FormItem): FormItem {
  return {
    ...it,
    title: String(it.title ?? "").trim(),
    author: it.author ? String(it.author).trim() : null,
    resource_type: RESOURCE_TYPES.includes(it.resource_type) ? it.resource_type : "book",
    resource_url: it.resource_url ? String(it.resource_url).trim() : null,
    domain_id: String(it.domain_id ?? "").trim(),
    ring_id:
      it.ring_id === "beginner" || it.ring_id === "intermediate" || it.ring_id === "advanced"
        ? it.ring_id
        : (RINGS[0]?.id as FormItem["ring_id"] ?? "beginner"),
    rating:
      it.rating && [1, 2, 3, 4, 5].includes(it.rating as number)
        ? (it.rating as FormItem["rating"])
        : ("" as FormItem["rating"]),
    reason: String(it.reason ?? "").trim(),
  };
}

function b64toBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
