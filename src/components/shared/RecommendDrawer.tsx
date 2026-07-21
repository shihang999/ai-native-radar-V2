"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DOMAINS, type RecommendationRating } from "@/lib/constants";
import { showToast } from "./Toast";

interface FormData {
  title: string;
  resource_type: "book" | "course" | "article";
  resource_url: string;
  domain_id: string;
  ring_id: "beginner" | "intermediate" | "advanced";
  rating: RecommendationRating | "";
  reason: string;
  recommender: string;
  invite_code: string;
}

interface FormErrors {
  title?: string;
  resource_type?: string;
  resource_url?: string;
  domain_id?: string;
  ring_id?: string;
  rating?: string;
  reason?: string;
  invite_code?: string;
}

/**
 * 推荐抽屉组件
 * 遵循 MVP 0.3.0 计划的设计规范
 */
export function RecommendDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    resource_type: "book",
    resource_url: "",
    domain_id: "",
    ring_id: "beginner",
    rating: "",
    reason: "",
    recommender: "",
    invite_code: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // 监听全局事件
  useEffect(() => {
    const handleOpenDrawer = () => setIsOpen(true);
    window.addEventListener("openRecommendDrawer", handleOpenDrawer);

    // 检查 URL Query
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "recommend") {
      setIsOpen(true);
    }

    return () => {
      window.removeEventListener("openRecommendDrawer", handleOpenDrawer);
    };
  }, []);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "请输入资料名称";
    }

    if (!formData.resource_type) {
      newErrors.resource_type = "请选择资料类型";
    }

    if (
      (formData.resource_type === "course" || formData.resource_type === "article") &&
      !formData.resource_url.trim()
    ) {
      newErrors.resource_url = "请输入资料链接";
    }

    if (formData.resource_url && !isValidUrl(formData.resource_url)) {
      newErrors.resource_url = "请输入有效的资料链接";
    }

    if (!formData.domain_id) {
      newErrors.domain_id = "请选择所属领域";
    }

    if (!formData.ring_id) {
      newErrors.ring_id = "请选择学习阶段";
    }

    if (!formData.rating) {
      newErrors.rating = "请选择推荐指数";
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "请输入推荐理由";
    } else if (formData.reason.trim().length < 20) {
      newErrors.reason = "推荐理由至少需要 20 字";
    }

    if (!formData.invite_code.trim()) {
      newErrors.invite_code = "请输入邀请码";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // 1. 验证邀请码（前端简单验证）
      if (formData.invite_code !== process.env.NEXT_PUBLIC_INVITE_CODE) {
        setErrors({ invite_code: "邀请码无效或已失效" });
        setIsSubmitting(false);
        return;
      }

      // 2. 检查重复推荐
      const { data: existingResources } = await supabase
        .from("resources")
        .select("id, title")
        .eq("title", formData.title)
        .limit(1);

      if (existingResources && existingResources.length > 0) {
        alert(`该资料已被推荐：${existingResources[0].title}`);
        setIsSubmitting(false);
        return;
      }

      // 3. 提交推荐
      const { error } = await supabase.from("user_recommendations").insert({
        title: formData.title.trim(),
        resource_type: formData.resource_type,
        resource_url: formData.resource_url.trim() || null,
        domain_id: formData.domain_id,
        ring_id: formData.ring_id,
        rating: formData.rating as RecommendationRating,
        reason: formData.reason.trim(),
        recommender: formData.recommender.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      // 成功
      setSubmitStatus("success");
      showToast("推荐提交成功！等待审核后将进入雷达", "success");

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("提交推荐失败:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      title: "",
      resource_type: "book",
      resource_url: "",
      domain_id: "",
      ring_id: "beginner",
      rating: "",
      reason: "",
      recommender: "",
      invite_code: "",
    });
    setErrors({});
    setSubmitStatus("idle");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* 抽屉主体 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#10213E]">推荐一本书</h2>
            <button
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6]"
              aria-label="关闭"
            >
              <svg className="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 表单内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* 成功提示 */}
            {submitStatus === "success" && (
              <div className="mb-6 rounded-lg border border-[#00524C] bg-[#00524C]/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-[#00524C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-medium text-[#00524C]">已收到你的推荐</p>
                    <p className="mt-1 text-sm text-[#00524C]/80">
                      你的推荐已进入审核队列，审核通过后将正式进入雷达。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {submitStatus === "error" && (
              <div className="mb-6 rounded-lg border border-[#EF4444] bg-[#EF4444]/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-[#EF4444]">提交失败</p>
                    <p className="mt-1 text-sm text-[#EF4444]/80">请检查网络连接后重试</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* 资料名称 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  资料名称 <span className="text-[#E63946]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                  placeholder="例如：深度学习入门"
                />
                {errors.title && <p className="mt-1 text-xs text-[#E63946]">{errors.title}</p>}
              </div>

              {/* 资料类型 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  资料类型 <span className="text-[#E63946]">*</span>
                </label>
                <div className="flex gap-3">
                  {(["book", "course", "article"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, resource_type: type })}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                        formData.resource_type === type
                          ? "border-[#5DB2E2] bg-[#5DB2E2]/10 text-[#5DB2E2]"
                          : "border-[#E2E8F0] text-[#64748B] hover:border-[#5DB2E2] hover:text-[#5DB2E2]"
                      }`}
                    >
                      {type === "book" && "书籍"}
                      {type === "course" && "课程"}
                      {type === "article" && "文章"}
                    </button>
                  ))}
                </div>
                {errors.resource_type && <p className="mt-1 text-xs text-[#E63946]">{errors.resource_type}</p>}
              </div>

              {/* 资料链接（课程/文章必填） */}
              {(formData.resource_type === "course" || formData.resource_type === "article") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213E]">
                    资料链接 <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.resource_url}
                    onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                    className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                    placeholder="https://example.com/resource"
                  />
                  {errors.resource_url && <p className="mt-1 text-xs text-[#E63946]">{errors.resource_url}</p>}
                </div>
              )}

              {/* 领域 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  领域 <span className="text-[#E63946]">*</span>
                </label>
                <select
                  value={formData.domain_id}
                  onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                >
                  <option value="">请选择领域</option>
                  {DOMAINS.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
                {errors.domain_id && <p className="mt-1 text-xs text-[#E63946]">{errors.domain_id}</p>}
              </div>

              {/* 学习阶段 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  学习阶段 <span className="text-[#E63946]">*</span>
                </label>
                <div className="flex gap-3">
                  {(["beginner", "intermediate", "advanced"] as const).map((ring) => (
                    <button
                      key={ring}
                      type="button"
                      onClick={() => setFormData({ ...formData, ring_id: ring })}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                        formData.ring_id === ring
                          ? "border-[#5DB2E2] bg-[#5DB2E2]/10 text-[#5DB2E2]"
                          : "border-[#E2E8F0] text-[#64748B] hover:border-[#5DB2E2] hover:text-[#5DB2E2]"
                      }`}
                    >
                      {ring === "beginner" && "入门"}
                      {ring === "intermediate" && "进阶"}
                      {ring === "advanced" && "高级"}
                    </button>
                  ))}
                </div>
                {errors.ring_id && <p className="mt-1 text-xs text-[#E63946]">{errors.ring_id}</p>}
              </div>

              {/* 推荐指数 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  推荐指数 <span className="text-[#E63946]">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star as RecommendationRating })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6]"
                    >
                      <svg
                        className={`h-6 w-6 ${
                          formData.rating && formData.rating >= star
                            ? "fill-[#F59E0B] text-[#F59E0B]"
                            : "text-[#E2E8F0]"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {errors.rating && <p className="mt-1 text-xs text-[#E63946]">{errors.rating}</p>}
              </div>

              {/* 推荐理由 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  推荐理由 <span className="text-[#E63946]">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                  placeholder="请说明推荐理由，至少 20 字"
                />
                {errors.reason && <p className="mt-1 text-xs text-[#E63946]">{errors.reason}</p>}
              </div>

              {/* 推荐人（可选） */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">推荐人（可选）</label>
                <input
                  type="text"
                  value={formData.recommender}
                  onChange={(e) => setFormData({ ...formData, recommender: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                  placeholder="你的名字或昵称"
                />
              </div>

              {/* 邀请码 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#10213E]">
                  邀请码 <span className="text-[#E63946]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.invite_code}
                  onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#10213E] placeholder-[#9CA3AF] focus:border-[#5DB2E2] focus:outline-none focus:ring-2 focus:ring-[#5DB2E2]/20"
                  placeholder="请输入邀请码"
                />
                {errors.invite_code && <p className="mt-1 text-xs text-[#E63946]">{errors.invite_code}</p>}
              </div>
            </form>
          </div>

          {/* 底部按钮 */}
          <div className="border-t border-[#E2E8F0] px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F5F6]"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-[#5DB2E2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8] disabled:opacity-50"
              >
                {isSubmitting ? "提交中..." : "提交推荐"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}