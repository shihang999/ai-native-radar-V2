#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量导入 CSV 数据到 Supabase（使用 PostgREST API）
"""

import pandas as pd
import requests
import json
import uuid
from datetime import datetime

# Supabase 配置
SUPABASE_URL = "https://pwiqyouhnoinoihavgks.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aXF5b3Vobm9pbm9paGF2Z2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTQwODYsImV4cCI6MjEwMDE5MDA4Nn0.YlPGUjfEfPiWcqOvJFyDlUWts2eRF9fOuzhW2Ukd29o"

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 能力主题到领域的映射
THEME_TO_DOMAIN_MAPPING = {
    "【全员通用】通用AI素养与AI Fluency 4D框架": "ai-fundamentals",
    "【全员通用】Prompt工程基础与进阶": "ai-fundamentals",
    "【全员通用】知识工程与Context管理": "ai-fundamentals",
    "【技术-应用】AI辅助开发(架构设计,  编码与代码审查等)": "ai-engineering",
    "【技术-应用】LLM应用技术选型与架构设计": "ai-engineering",
    "【技术-应用】AI系统与Agent评估监测": "ai-engineering",
    "【技术-应用】Agent系统设计与多智能体架构": "agent-systems",
    "【技术-数据】语义检索系统设计与RAG": "data-intelligence",
    "【技术-数据】面向AI的数据治理": "data-intelligence",
    "【技术-数据】实时数据流与AI集成": "data-intelligence",
    "【技术-平台】LLMOps平台设计与模型全生命周期管理": "ai-engineering",
    "【技术-平台】模型推理优化和加速（量化/推理服务）": "ai-engineering",
    "【技术-平台】模型推理优化与加速（量化/推理服务）": "ai-engineering",
    "【技术-平台】AI安全治理与AI Governance": "ai-engineering",
    "【技术-平台】AgentOS平台搭建与Agent运行时": "ai-engineering",
    "【产品】AI产品需求分析与场景探索": "ai-product-method",
    "【测试】AI辅助测试工程与LLM/Agent测试评估": "ai-engineering",
    "【测试】AI系统专项质量验证（对抗测试/偏见检测/可解释性）": "ai-engineering",
    "【FDE】业务流程建模与重构（价值流/业务本体/知识管理等)": "business-landing",
    "【FDE】AI应用生产部署与交付实施": "business-landing",
    "【FDE】业务流程建模与重构（价值流/业务本体/知识管理等）": "business-landing",
    "【项目管理】AI辅助项目管理与项目管理数字化工具": "org-change",
}

# 资料类型映射
RESOURCE_TYPE_MAPPING = {
    "书籍": "book",
    "在线课程/官方文档": "course",
    "文章/其他资料": "article"
}

# 推荐程度映射
RATING_MAPPING = {
    "⭐⭐⭐": 3,
    "⭐⭐⭐⭐": 4,
    "⭐⭐⭐⭐⭐": 5
}

def import_resources_batch(resources_data):
    """批量导入资源到 Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/resources"

    try:
        response = requests.post(url, headers=HEADERS, json=resources_data)

        if response.status_code == 201:
            return True, f"成功导入 {len(resources_data)} 条数据"
        else:
            return False, f"导入失败: {response.status_code} - {response.text}"

    except Exception as e:
        return False, f"导入异常: {str(e)}"

def convert_csv_to_resources():
    """读取 CSV 并转换为资源列表"""

    # 读取 CSV
    df = pd.read_csv('AI-Native读书雷达·资料共建.csv')

    print(f"读取到 {len(df)} 条数据")

    resources = []
    imported_count = 0
    skipped_count = 0

    for index, row in df.iterrows():
        try:
            # 映射能力主题到领域
            domain_id = THEME_TO_DOMAIN_MAPPING.get(row['能力主题'], 'ai-fundamentals')

            # 映射资料类型
            resource_type = RESOURCE_TYPE_MAPPING.get(row['资料类型'], 'book')

            # 映射推荐程度
            rating = RATING_MAPPING.get(row['推荐程度'], 3)

            # 构建资源对象
            resource = {
                "id": str(uuid.uuid4()),
                "title": row['资料名称'],
                "resource_type": resource_type,
                "resource_url": row['资料链接'] if pd.notna(row['资料链接']) else None,
                "domain_id": domain_id,
                "ring_id": "beginner",
                "rating": rating,
                "reason": row['推荐理由'],
                "recommender": row['推荐人'] if pd.notna(row['推荐人']) else None,
                "status": "approved",
                "published_at": datetime.now().isoformat()
            }

            resources.append(resource)
            imported_count += 1

        except Exception as e:
            print(f"行 {index + 1} 处理失败: {e}")
            skipped_count += 1
            continue

    print(f"\n处理结果：")
    print(f"  ✅ 成功: {imported_count} 条")
    print(f"  ❌ 失败: {skipped_count} 条")

    return resources

def main():
    """主函数"""
    print("=== 开始导入 CSV 数据到 Supabase ===\n")

    # 转换 CSV 到资源列表
    resources = convert_csv_to_resources()

    if not resources:
        print("❌ 没有数据需要导入")
        return

    # 分批导入（每批 50 条）
    batch_size = 50
    total_batches = (len(resources) // batch_size) + 1

    print(f"\n开始批量导入，共 {total_batches} 批")

    success_count = 0
    fail_count = 0

    for i in range(0, len(resources), batch_size):
        batch = resources[i:i + batch_size]
        batch_num = (i // batch_size) + 1

        success, message = import_resources_batch(batch)

        if success:
            print(f"  ✅ 批次 {batch_num}/{total_batches}: {message}")
            success_count += len(batch)
        else:
            print(f"  ❌ 批次 {batch_num}/{total_batches}: {message}")
            fail_count += len(batch)

    print(f"\n=== 导入完成 ===")
    print(f"  ✅ 成功: {success_count} 条")
    print(f"  ❌ 失败: {fail_count} 条")

if __name__ == "__main__":
    main()