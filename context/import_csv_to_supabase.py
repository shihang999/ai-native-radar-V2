#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 数据导入脚本：将 AI-Native 读书雷达资料数据导入到 Supabase
"""

import pandas as pd
import json
import uuid
from datetime import datetime

# 能力主题到领域的映射
THEME_TO_DOMAIN_MAPPING = {
    # 【全员通用】→ ai-fundamentals
    "【全员通用】通用AI素养与AI Fluency 4D框架": "ai-fundamentals",
    "【全员通用】Prompt工程基础与进阶": "ai-fundamentals",
    "【全员通用】知识工程与Context管理": "ai-fundamentals",

    # 【技术-应用】→ ai-engineering 或 agent-systems
    "【技术-应用】AI辅助开发(架构设计,  编码与代码审查等)": "ai-engineering",
    "【技术-应用】LLM应用技术选型与架构设计": "ai-engineering",
    "【技术-应用】AI系统与Agent评估监测": "ai-engineering",
    "【技术-应用】Agent系统设计与多智能体架构": "agent-systems",

    # 【技术-数据】→ data-intelligence
    "【技术-数据】语义检索系统设计与RAG": "data-intelligence",
    "【技术-数据】面向AI的数据治理": "data-intelligence",
    "【技术-数据】实时数据流与AI集成": "data-intelligence",

    # 【技术-平台】→ ai-engineering
    "【技术-平台】LLMOps平台设计与模型全生命周期管理": "ai-engineering",
    "【技术-平台】模型推理优化和加速（量化/推理服务）": "ai-engineering",
    "【技术-平台】模型推理优化与加速（量化/推理服务）": "ai-engineering",
    "【技术-平台】AI安全治理与AI Governance": "ai-engineering",
    "【技术-平台】AgentOS平台搭建与Agent运行时": "ai-engineering",

    # 【产品】→ ai-product-method
    "【产品】AI产品需求分析与场景探索": "ai-product-method",

    # 【测试】→ ai-engineering
    "【测试】AI辅助测试工程与LLM/Agent测试评估": "ai-engineering",
    "【测试】AI系统专项质量验证（对抗测试/偏见检测/可解释性）": "ai-engineering",

    # 【FDE】→ business-landing
    "【FDE】业务流程建模与重构（价值流/业务本体/知识管理等)": "business-landing",
    "【FDE】AI应用生产部署与交付实施": "business-landing",
    "【FDE】业务流程建模与重构（价值流/业务本体/知识管理等）": "business-landing",

    # 【项目管理】→ org-change
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

def convert_csv_to_sql():
    """读取 CSV 并转换为 SQL INSERT 语句"""

    # 读取 CSV
    df = pd.read_csv('AI-Native读书雷达·资料共建.csv')

    print(f"读取到 {len(df)} 条数据")

    # 生成 SQL 语句
    sql_statements = []
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

            # 处理空值
            resource_url = "NULL" if pd.isna(row['资料链接']) else f"'{row['资料链接']}'"
            recommender = "NULL" if pd.isna(row['推荐人']) else f"'{row['推荐人']}'"

            # 生成 UUID
            resource_id = str(uuid.uuid4())

            # 转义单引号
            title = row['资料名称'].replace("'", "''")
            reason = row['推荐理由'].replace("'", "''")

            # 生成 SQL
            sql = f"""INSERT INTO resources (
  id, title, resource_type, resource_url, domain_id, ring_id, rating, reason, recommender, status, published_at
) VALUES (
  '{resource_id}',
  '{title}',
  '{resource_type}',
  {resource_url},
  '{domain_id}',
  'beginner',
  {rating},
  '{reason}',
  {recommender},
  'approved',
  NOW()
);"""

            sql_statements.append(sql)
            imported_count += 1

        except Exception as e:
            print(f"行 {index + 1} 处理失败: {e}")
            skipped_count += 1
            continue

    print(f"\n处理结果：")
    print(f"  ✅ 成功: {imported_count} 条")
    print(f"  ❌ 失败: {skipped_count} 条")

    return sql_statements

def main():
    """主函数"""
    print("=== 开始导入 CSV 数据 ===\n")

    # 转换 CSV 到 SQL
    sql_statements = convert_csv_to_sql()

    # 保存到文件
    output_file = 'import_resources.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- AI-Native 读书雷达资源数据导入\n")
        f.write(f"-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- 总计: {len(sql_statements)} 条记录\n\n")
        f.write('\n'.join(sql_statements))

    print(f"\n✅ SQL 文件已保存: {output_file}")
    print(f"   总计: {len(sql_statements)} 条 INSERT 语句")

if __name__ == "__main__":
    main()