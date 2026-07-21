#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能分配资源圈层：根据资源特征自动分配 beginner/intermediate/advanced
"""

import pandas as pd
import requests
import re

# Supabase 配置
SUPABASE_URL = "https://pwiqyouhnoinoihavgks.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aXF5b3Vobm9pbm9paGF2Z2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTQwODYsImV4cCI6MjEwMDE5MDA4Nn0.YlPGUjfEfPiWcqOvJFyDlUWts2eRF9fOuzhW2Ukd29o"

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 圈层判断规则
def determine_ring(row):
    """
    根据资源特征判断圈层
    返回: 'beginner', 'intermediate', 'advanced'
    """

    title = str(row['资料名称']).lower()
    reason = str(row['推荐理由']).lower() if pd.notna(row['推荐理由']) else ""
    rating = row['推荐程度']
    resource_type = row['资料类型']

    # 高级关键词
    advanced_keywords = [
        'architecture', '设计', '架构', 'advanced', '高级', 'performance',
        '性能', 'optimization', '优化', 'engineering', '工程化', 'production',
        '生产', 'maturity', '成熟度', 'governance', '治理'
    ]

    # 进阶关键词
    intermediate_keywords = [
        'design', '设计模式', 'pattern', 'multi-agent', '多智能体',
        'fine-tuning', '微调', 'evaluation', '评估', 'lifecycle',
        '生命周期', 'retrieval', '检索', 'generation'
    ]

    # 入门关键词
    beginner_keywords = [
        'introduction', '入门', '基础', 'guide', '指南', 'tutorial',
        '教程', 'foundations', '基础', 'hands-on', '实战', 'beginner',
        'prompt engineering', '官方文档', 'documentation'
    ]

    # 规则1: 检查标题中的关键词
    for keyword in advanced_keywords:
        if keyword in title:
            return 'advanced'

    for keyword in intermediate_keywords:
        if keyword in title:
            return 'intermediate'

    # 规则2: 检查推荐理由中的关键词
    for keyword in advanced_keywords:
        if keyword in reason:
            return 'advanced'

    for keyword in intermediate_keywords:
        if keyword in reason:
            return 'intermediate'

    # 规则3: 根据推荐程度判断（⭐⭐⭐⭐通常是进阶以上）
    if rating == '⭐⭐⭐⭐':
        return 'intermediate'

    # 规则4: 根据资料类型判断
    if resource_type == '书籍' and rating == '⭐⭐⭐⭐':
        return 'intermediate'

    if resource_type == '文章/其他资料' and rating == '⭐⭐⭐⭐':
        return 'intermediate'

    # 默认返回入门
    return 'beginner'

def fetch_all_resources():
    """从 Supabase 获取所有资源"""
    url = f"{SUPABASE_URL}/rest/v1/resources?select=id,title,reason,rating,resource_type"

    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"获取资源失败: {response.status_code}")
            return []
    except Exception as e:
        print(f"获取资源异常: {e}")
        return []

def update_resource_ring(resource_id, ring_id):
    """更新资源的圈层"""
    url = f"{SUPABASE_URL}/rest/v1/resources?id=eq.{resource_id}"

    try:
        response = requests.patch(url, headers=HEADERS, json={"ring_id": ring_id})
        return response.status_code == 204
    except Exception as e:
        print(f"更新失败: {e}")
        return False

def main():
    """主函数"""
    print("=== 开始智能分配资源圈层 ===\n")

    # 读取 CSV
    df = pd.read_csv('AI-Native读书雷达·资料共建.csv')

    print(f"读取到 {len(df)} 条数据")

    # 分配圈层
    ring_allocation = {
        'beginner': 0,
        'intermediate': 0,
        'advanced': 0
    }

    updates = []

    for index, row in df.iterrows():
        ring = determine_ring(row)
        ring_allocation[ring] += 1

        # 准备更新数据
        updates.append({
            'index': index,
            'title': row['资料名称'],
            'ring': ring
        })

    print(f"\n圈层分配结果：")
    print(f"  🟢 入门: {ring_allocation['beginner']} 条")
    print(f"  🟡 进阶: {ring_allocation['intermediate']} 条")
    print(f"  🔴 高级: {ring_allocation['advanced']} 条")

    # 显示示例
    print(f"\n示例数据：")
    for ring in ['advanced', 'intermediate', 'beginner']:
        print(f"\n{ring.upper()} 层示例：")
        examples = [u for u in updates if u['ring'] == ring][:3]
        for example in examples:
            print(f"  - {example['title']}")

    # 获取数据库中的资源
    print(f"\n开始更新数据库...")
    resources = fetch_all_resources()

    if not resources:
        print("❌ 无法获取资源数据")
        return

    print(f"获取到 {len(resources)} 条资源")

    # 批量更新
    success_count = 0
    fail_count = 0

    # 按标题匹配并更新
    for update in updates:
        # 查找对应的资源
        matching_resources = [r for r in resources if r['title'] == update['title']]

        for resource in matching_resources:
            if update_resource_ring(resource['id'], update['ring']):
                success_count += 1
            else:
                fail_count += 1

    print(f"\n=== 更新完成 ===")
    print(f"  ✅ 成功: {success_count} 条")
    print(f"  ❌ 失败: {fail_count} 条")

if __name__ == "__main__":
    main()