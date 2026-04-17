---
title: "🚀 3x-ui 部署科学上网"
slug: "3x-ui-bu-shu-ke-xue-shang-wang"
created: "2026-04-13T09:53:41.000Z"
modified: "2026-04-13T10:37:19.000Z"
description: "📋 准备工作 Checklist 1. VPS 一台：假设 IP 为 ，系统为 Ubuntu/Debian。 2. 域名一个：假设为 。 3. 端口检查：确保 VPS 的 80 端口 和 443 端口 未被占用（用于申请证书和运行服务）。 --- 步骤一：DNS 解析配置 在你"
tags: []
---
## 📋 准备工作 Checklist

1. **VPS 一台**：假设 IP 为 `1.1.1.1`，系统为 Ubuntu/Debian。
2. **域名一个**：假设为 `proxy.example.com`。
3. **端口检查**：确保 VPS 的 **80 端口** 和 **443 端口** 未被占用（用于申请证书和运行服务）。

---

## 步骤一：DNS 解析配置

在你的域名服务商（推荐 Cloudflare）处配置解析。

1. **添加 A 记录**：
    - **Name (名称)**: `proxy`
    - **IPv4 Address (内容)**: `1.1.1.1` (你的 VPS IP)
    - **Proxy Status (代理状态)**: **DNS Only (仅 DNS / 灰色云)**。
    - *注意：必须先关闭小黄云，否则 SSL 证书申请时的 HTTP 验证请求会被 Cloudflare 拦截导致失败。*

---

## 步骤二：环境安装与 Docker 部署

登录 VPS，执行以下命令。

### 1. 创建目录与配置文件

```bash
mkdir 3x-ui
vi docker-compose.yml
```

### 2. 编写 docker-compose.yml

```yaml
services:
  3x-ui:    # 这样 Docker 必须去下载这个特定版本，绝对不会出错
    image: ghcr.io/mhsanaei/3x-ui:latest
    container_name: 3x-ui
    hostname: x-ui
    network_mode: host
    volumes:
      - ./db/:/etc/x-ui/
      - ./cert/:/root/cert/
      - ./logs/:/var/log/x-ui/
      - ./acme/:/root/.acme.sh/
    environment:
      - XRAY_VMESS_AEAD_FORCED=false
    restart: unless-stopped
```

### 3. 启动容器

```bash
sudo docker compose up -d
```

---

## 步骤三：面板初始化

1. **访问面板**：
    - 地址：`http://XX.XX.XXX.XX:2053`
    - 默认账号：`admin`
    - 默认密码：`admin`
1. **强制修改密码**：
    - 登录后，立即点击左侧 **“面板设置”**。
    - 修改 **面板监听端口**（建议改为 `9999` 或其他非标准端口，防止被扫描）。
    - 修改 **用户名** 和 **密码**。
    - 点击“保存”并“重启面板”。
    - *注意：重启后需要用新端口 `http://你的IP:9999` 重新登录。*

---

## 步骤四：申请 SSL 证书 (核心步骤)

命令中申请证书

```bash
sudo docker exec -it 3x-ui x-ui

18. SSL Certificate Management
```

申请好的证书在3x-ui 的容器安装目录下

```bash

ubuntu@vmiss:~/3x-ui/cert/XXXXXX.xyz$ ll
-rw-r--r-- 1 root root 2848 Feb 12 11:38 fullchain.pem
-rw------- 1 root root  227 Feb 12 11:38 privkey.pem

页面配置
/root/cert/XXXX.xyz/fullchain.pem
/root/cert/XXXX.xyz/privkey.pem

```

---

## 步骤五：配置 Trojan服务

### 第一步：在 3x-ui 面板添加入站

**Trojan 在 3x-ui 里的配置极其简单：**

1. **协议**：`trojan`
2. **端口**：`443` (先把之前的 VMess 删了或改端口，避免冲突)
3. **密码**：随便填。
4. **传输配置** -> **TLS**：
    - **公钥/私钥**：填你那两个路径。

```bash
/root/cert/XXXX.xyz/fullchain.pem
/root/cert/XXXX.xyz/privkey.pem
```

    - **SNI**：`XXXXX.xyz`
    - **(关键)** 这里不需要配 WS，不需要配 Path，不需要配 ALPN（默认就行）。
1. **点击 添加。然后面板会提示重启 Xray，点确认。**
2. **Surge 配置**：你会发现，Trojan 通常“一次就通”，没有那么多复杂的参数坑。

---

### 第三步：验证与进阶（CDN 救活）

#### 1. 验证直连

在客户端连接后，先不要开 Cloudflare 的小黄云（保持 DNS Only）。

- 访问 `ip111.cn`，如果能看到你 VPS 的 IP，说明配置成功。

#### 2. (可选) 开启 Cloudflare CDN 隐藏 IP

如果你觉得直连速度慢，或者为了保护 VPS IP：

1. 去 Cloudflare 后台，把 `vmiss` 的 DNS 记录的小云朵点亮（变成**橙色/Proxied**）。
2. 回到你的客户端，不用改任何配置，直接测速。
3. 此时你的流量路径变成了：`手机 -> Cloudflare节点 -> 你的VPS`。
    - *好处：VPS 真实 IP 被隐藏，防火墙很难封锁。*
    - *坏处：可能会变慢（取决于 Cloudflare 给你的节点好坏）。*

### ⚠️ 常见排查

如果配置完连不上：

1. **时间同步**：VMess 对时间极度敏感。请在 VPS 输入 `date`，确保时间和你不差超过 90 秒。如果时间不对，请执行 `cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime` 同步时间。
2. **路径错误**：WS 的路径（Path）必须首尾都有斜杠或者完全一致，哪怕差一个字母都不行。
3. **端口防火墙**：如果你用了 8443 等非标准端口，记得去 VMISS 后台安全组放行这个端口。
