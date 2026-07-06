# 🚀 变现操作手册 — 从收款到交货全流程

## 你的工具箱

| 工具 | 用途 | 位置 |
|------|------|------|
| `scripts/generate-license-keys.mjs` | 生成激活码 | 项目目录 |
| `MARKETING.md` | 推广文案 | 项目目录 |
| `demo-script.md` | 视频脚本 | 项目目录 |
| `.env` | 支付+密钥配置 | 项目目录 |

---

## 路线 A：手动模式（今天就能收钱）

### Step 1: 准备

```bash
# 生成 5 个 Pro 月付激活码（1 个月有效期）
POKERGTO_LICENSE_SECRET=dbcd6189d8f0496f0049062a54aa767a5cdb19f0880f9ddc2db9d15dc9b4c156 \
  node scripts/generate-license-keys.mjs pro 5 1

# 生成 2 个终身激活码
POKERGTO_LICENSE_SECRET=dbcd6189d8f0496f0049062a54aa767a5cdb19f0880f9ddc2db9d15dc9b4c156 \
  node scripts/generate-license-keys.mjs lifetime 2

# 生成 3 个 Pro 年付激活码
POKERGTO_LICENSE_SECRET=dbcd6189d8f0496f0049062a54aa767a5cdb19f0880f9ddc2db9d15dc9b4c156 \
  node scripts/generate-license-keys.mjs pro 3 12
```

### Step 2: 发帖

复制 `MARKETING.md` 里的短版文案 → 发微信群/朋友圈/QQ群。
加上你的微信/支付宝收款码截图。

### Step 3: 收款 → 交货

客户付款后，私信发：

```
🎫 您的 PokerGTO Trainer 激活码：

PGTO-XXXX-XXXX-XXXX

📥 下载地址：[你的网盘链接]

🔧 安装后打开 App → 进入「账户」→ 粘贴激活码 → 点「激活」
   全部功能立即解锁。

💬 有任何问题随时找我。
```

### Step 4: 打包应用

```bash
npm run build
```

然后把打包好的应用上传到：
- 百度网盘
- 蓝奏云（国内下载快）
- 阿里云盘

---

## 路线 B：Lemon Squeezy 自动售卖（本周搭好）

### 需要你做的（15 分钟）：

1. 打开 [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com)
2. Settings → API → 生成 API Key
3. 创建 3 个产品：
   - Pro Monthly $29.99
   - Pro Yearly $219（建议设 $219/yr = $18.25/mo）
   - Lifetime $299
4. 每个产品 → Variants 页 → 复制 Variant ID（`var_xxxxx` 格式）
5. 填入 `.env`：

```
VITE_LS_API_KEY=你的API密钥
VITE_LS_STORE_ID=1180615
VITE_LS_PRO_MONTHLY=var_xxxxx
VITE_LS_PRO_YEARLY=var_yyyyy
VITE_LS_LIFETIME=var_zzzzz
```

6. `npm run build` → 用户点「升级」就能直接跳转 LS 付款

### LS 的优势：
- 支持微信支付 / 支付宝（中国用户无摩擦）
- 自动处理订阅续费
- 自动发邮件收据
- 7 天退款政策

---

## 定价策略速查

| 产品 | 价格 | 激活码过期 | 目标用户 |
|------|------|-----------|---------|
| Pro 月付 | ¥218 ($30) | 1 个月 | 想先试试的玩家 |
| Pro 年付 | ¥1588 ($219) | 12 个月 | 长期训练用户 |
| 终身 | ¥2180 ($299) | 2099 年 | 硬核玩家/教练 |

---

## 客户 FAQ 备答

**Q: 和 GTO Wizard 有什么区别？**
A: 我们是桌面端离线应用，全中文，价格只要 GTO Wizard 的 1/3。功能覆盖 90% 的日常训练需求。

**Q: Mac 能用吗？**
A: 能。Mac (Apple Silicon + Intel) 和 Windows 都支持。

**Q: 激活码能换电脑吗？**
A: 一个激活码绑定一台设备。换电脑找我换新码。

**Q: 能退款吗？**
A: 购买后 7 天内无理由退款。

**Q: 有试用吗？**
A: App 自带演示模式，可以免费体验。

---

## 今日行动计划

- [ ] 生成 10 个激活码存好
- [ ] 打包应用，上传网盘
- [ ] 发微信群 / 朋友圈（短版文案）
- [ ] 发知乎 / 贴吧（长版文案）
- [ ] 私信 5 个打牌的朋友
- [ ] 收钱 → 发码 → 交付
