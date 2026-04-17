---
title: "Headscale 虚拟组网实战"
slug: "headscale-xu-ni-zu-wang-shi-zhan"
created: "2026-04-17T00:00:00.000Z"
modified: "2026-04-17T00:00:00.000Z"
description: "Headscale 异地虚拟组网实战：VPS + 群晖 + 极空间 + Ubuntu 如果你手上有一台公网 VPS，再加上分散在不同地点的 NAS、Ubuntu 服务器，最舒服的做法，通常就是自己搭一个 控制面，再让各个设备通过 客户端接入。 这篇文章我按自己的实际场景，整理一套"
tags: []
---
# Headscale 异地虚拟组网实战：VPS + 群晖 + 极空间 + Ubuntu

如果你手上有一台公网 VPS，再加上分散在不同地点的 NAS、Ubuntu 服务器，最舒服的做法，通常就是自己搭一个 `Headscale` 控制面，再让各个设备通过 `Tailscale` 客户端接入。

这篇文章我按自己的实际场景，整理一套比较稳、也比较容易复用的方案：**VPS 部署 Headscale 服务端，其余设备全部作为客户端接入；如果有需要，再进一步打通各自所在的局域网。**

---

## 一、场景说明

我当前的网络结构，大致是这样：

1. **一台公网 VPS**：负责运行 `Headscale`，同时自己也加入虚拟网络。
2. **一台群晖 NAS**：位于 A 地家庭网络。
3. **一台极空间 NAS**：位于 B 地家庭网络。
4. **若干台 Ubuntu 服务器**：有的需要宣告本地网段，有的只需要作为普通节点接入。

对应的整体架构，就是一个典型的 **Hub-and-Spoke（中心辐射）** 模式。

![](/uploads/posts/headscale-xu-ni-zu-wang-shi-zhan/assets/network-architecture-diagram-1.png)

![](/uploads/posts/headscale-xu-ni-zu-wang-shi-zhan/assets/network-architecture-diagram-2.png)

- **VPS（控制中心）**：运行 `Headscale` 服务端 + `Tailscale` 客户端。
- **群晖 / 极空间 / Ubuntu**：运行 `Tailscale` 客户端。
- **可选进阶**：通过路由宣告，把不同地点的局域网也打通。

---

## 二、部署前准备

正式开始前，建议先准备好这些信息：

1. **一台公网 VPS**：本文默认系统为 Ubuntu / Debian。
2. **一个域名**：例如 `tailscale.example.com`，并解析到 VPS。
3. **Docker 环境**：服务端和大多数客户端都用 Docker 部署。
4. **明确每个站点的局域网段**：
   - 群晖所在网段：`192.168.41.0/24`
   - 极空间所在网段：`192.168.31.0/24`
   - 某台 Ubuntu 所在网段：`10.0.0.0/24`
   - 另一台 Ubuntu 所在网段：`10.0.4.0/24`

如果你只是想让设备之间互相访问 `100.x.x.x` 的虚拟地址，那么做到“节点接入”就够了；如果你希望直接访问对方内网机器，例如 `192.168.31.x`、`192.168.41.x`，那就继续看到后面的“站点互通”部分。

---

## 三、先记住几个常用命令

这几个命令基本贯穿全文，先放在前面方便查：

```bash
# 注册节点
sudo docker exec headscale headscale nodes register --key <REGISTER_KEY> --user admin

# 查看所有节点
sudo docker exec headscale headscale nodes list

# 强制删除节点
sudo docker exec headscale headscale nodes delete -i <NODE_ID> --force

# 批准某个节点宣告的子网路由
sudo docker exec headscale headscale nodes approve-routes -i <NODE_ID> --routes "192.168.41.0/24"

# 查看某个节点已经批准的路由
sudo docker exec headscale headscale nodes routes list -i <NODE_ID>

# 查看节点连通状态 / 打洞情况
sudo docker exec headscale tailscale status
```

---

## 四、步骤一：部署 Headscale 服务端

这一部分的目标很明确：**先把控制面搭起来，再让 VPS 自己也加入这张虚拟网络。**

### 1. 准备目录与数据文件

在 VPS 上执行：

```bash
mkdir -p /root/headscale/config
mkdir -p /root/headscale/data
touch /root/headscale/data/db.sqlite
```

---

### 2. 编写 `config.yaml`

建议先下载官方模板，再按自己的环境修改关键字段。下面给一份适合教程演示的简化版本：

```yaml
server_url: https://tailscale.example.com
listen_addr: 0.0.0.0:8022
metrics_listen_addr: 127.0.0.1:9090
grpc_listen_addr: 127.0.0.1:50443
grpc_allow_insecure: false

noise:
  private_key_path: /var/lib/headscale/noise_private.key

prefixes:
  v4: 100.64.0.0/10
  v6: fd7a:115c:a1e0::/48
  allocation: sequential

derp:
  server:
    enabled: false
    region_id: 999
    region_code: "headscale"
    region_name: "Headscale Embedded DERP"
    verify_clients: true
    stun_listen_addr: "0.0.0.0:3478"
    private_key_path: /var/lib/headscale/derp_server_private.key
    automatically_add_embedded_derp_region: true
    ipv4: 1.2.3.4
  urls:
    - https://controlplane.tailscale.com/derpmap/default
  paths: []
  auto_update_enabled: true
  update_frequency: 3h

disable_check_updates: false
ephemeral_node_inactivity_timeout: 30m

database:
  type: sqlite
  debug: false
  sqlite:
    path: /var/lib/headscale/db.sqlite
    write_ahead_log: true

log:
  level: info
  format: text

policy:
  mode: file
  path: ""

dns:
  magic_dns: true
  base_domain: example.com
  override_local_dns: true
  nameservers:
    global:
      - 1.1.1.1
      - 1.0.0.1
  search_domains: []
  extra_records: []

unix_socket: /var/run/headscale/headscale.sock
unix_socket_permission: "0770"

logtail:
  enabled: false

randomize_client_port: false
taildrop:
  enabled: true
```

这里有两个点最关键：

1. `server_url` 要写成你客户端最终访问到的地址。
2. `listen_addr` 和 `3478/udp` 需要在防火墙或安全组里放行。

如果你打算长期使用，**更推荐反向代理 + HTTPS**，不要只停留在裸 `IP:端口` 的临时方案。

---

### 3. 编写 `docker-compose.yml`

```yaml
services:
  headscale:
    image: headscale/headscale:stable
    container_name: headscale
    volumes:
      - ./config:/etc/headscale
      - ./data:/var/lib/headscale
    ports:
      - "8022:8022"
      - "3478:3478/udp"
    command: serve
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
```

启动容器：

```bash
sudo docker compose up -d
```

---

### 4. 创建用户

```bash
sudo docker exec headscale headscale users create admin
```

---

### 5. 让 VPS 自己也加入虚拟网络

很多人搭完服务端就停了，但如果你希望 NAS 能直接访问 VPS 上的服务或文件，**VPS 本身也应该作为一个 Tailscale 节点加入网络。**

可以单独再起一个客户端容器：

```yaml
services:
  tailscale-vps:
    image: tailscale/tailscale:latest
    container_name: tailscale-vps
    privileged: true
    network_mode: "host"
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_HOSTNAME=vps
      - TS_LOGIN_SERVER=https://tailscale.example.com
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes --force-reauth
      - TS_USERSPACE=false
      - TZ=Asia/Shanghai
      - TS_ROUTES=10.0.4.0/24
    restart: always
```

启动后查看日志，拿到注册链接里的 `key`，再回到 VPS 上注册：

```bash
sudo docker exec headscale headscale nodes register --key <REGISTER_KEY> --user admin
```

到这里，服务端部分就算搭好了。

---

## 五、步骤二：接入群晖 NAS

群晖这一步的目标是：**让 NAS 作为客户端接入，并按需宣告自己所在的局域网段。**

### 1. 先检查 `TUN` 设备

```bash
ls /dev/net/tun
```

如果这里报错，说明你的群晖还没开启 `TUN`。这一步必须先解决，否则 `Tailscale` 容器起不来。

---

### 2. 编写 `docker-compose.yml`

```yaml
services:
  tailscale-synology:
    image: tailscale/tailscale:latest
    container_name: tailscale-synology
    network_mode: "host"
    privileged: true
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_HOSTNAME=ds918
      - TS_LOGIN_SERVER=https://tailscale.example.com
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
      - TS_USERSPACE=false
      - TZ=Asia/Shanghai
      - TS_ROUTES=192.168.41.0/24
    restart: always
```

这里的重点有两个：

1. `network_mode: "host"` 比较省心，很多 NAS 场景都更稳。
2. `TS_ROUTES=192.168.41.0/24` 表示它会向 Headscale 宣告“我后面还有一个局域网段可以转发”。

---

### 3. 启动并完成注册

```bash
sudo docker compose up -d
sudo docker logs tailscale-synology
```

日志里会出现一个注册链接，例如：

```text
https://tailscale.example.com/register/xxxxxxxxxxxxxxxx
```

复制其中的注册 `key`，到 VPS 上执行：

```bash
sudo docker exec headscale headscale nodes register --key <REGISTER_KEY> --user admin
```

---

## 六、步骤三：接入极空间 NAS

极空间本质上也是 Linux，配置思路和群晖几乎一样，主要区别是**路径写法**和你更习惯用图形界面还是 SSH。

### 1. 编写部署配置

```yaml
services:
  tailscale-z4s:
    image: tailscale/tailscale:latest
    container_name: tailscale-z4s
    network_mode: "host"
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - /your/path/docker/tailscale/state:/var/lib/tailscale
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_HOSTNAME=z4s
      - TS_LOGIN_SERVER=https://tailscale.example.com
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
      - TS_USERSPACE=false
      - TZ=Asia/Shanghai
      - TS_ROUTES=192.168.31.0/24
    restart: always
```

如果你只想让它作为普通节点接入，不需要转发整个局域网，也可以先不写 `TS_ROUTES`。

---

### 2. 启动并注册

如果你用极空间图形界面管理 Docker，直接在“项目 / Compose”里粘贴运行即可；如果你习惯 SSH，也一样可以走命令行。

拿到注册 `key` 后，还是回到 VPS 执行：

```bash
sudo docker exec headscale headscale nodes register --key <REGISTER_KEY> --user admin
```

---

## 七、步骤四：接入 Ubuntu 服务器

Ubuntu 服务器这边，分两种情况：

1. **既要加入网络，也要暴露自己后面的局域网段**。
2. **只作为普通节点加入，不宣告额外路由**。

---

### 1. 带子网路由的 Ubuntu 节点

比如这台机器后面还有 `10.0.0.0/24`：

```yaml
services:
  tailscale-ubuntu:
    image: tailscale/tailscale:latest
    container_name: tailscale-ubuntu
    network_mode: "host"
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - /home/ubuntu/tailscale/state:/var/lib/tailscale
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_HOSTNAME=ubuntu-router
      - TS_LOGIN_SERVER=https://tailscale.example.com
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
      - TS_USERSPACE=false
      - TZ=Asia/Shanghai
      - TS_ROUTES=10.0.0.0/24
    restart: always
```

启动后同样查看日志、拿 `key`、去 VPS 注册即可。

---

### 2. 普通 Ubuntu 节点

如果这台服务器没有需要共享的内网段，那配置可以更简单：

```yaml
services:
  tailscale-ubuntu:
    image: tailscale/tailscale:latest
    container_name: tailscale-ubuntu
    network_mode: "host"
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - /home/ubuntu/tailscale/state:/var/lib/tailscale
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_HOSTNAME=ubuntu-node
      - TS_LOGIN_SERVER=https://tailscale.example.com
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
      - TS_USERSPACE=false
      - TZ=Asia/Shanghai
    restart: always
```

这类节点注册成功后，就可以直接通过 Headscale 分配到的虚拟 IP 互访。

---

## 八、进阶：打通不同站点的局域网

如果你已经完成所有节点接入，那么现在设备之间应该已经能通过虚拟 IP 通信了。

接下来这一步，是把它从“设备互联”升级成“网段互联”。

比如：

- 群晖在 `192.168.41.0/24`
- 极空间在 `192.168.31.0/24`

目标就是让这两个网段也能互通。

---

### 1. 客户端要同时做到“宣告路由 + 接收路由”

#### 群晖配置

```yaml
services:
  tailscale-synology:
    environment:
      - TS_ROUTES=192.168.41.0/24
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
```

#### 极空间配置

```yaml
services:
  tailscale-z4s:
    environment:
      - TS_ROUTES=192.168.31.0/24
      - TS_EXTRA_ARGS=--login-server=https://tailscale.example.com --accept-routes
```

修改完以后，两边都重新启动：

```bash
sudo docker compose up -d
```

---

### 2. 宿主机必须开启 IP 转发

只改容器参数还不够，宿主机内核也必须允许转发。

在群晖 / 极空间 / Ubuntu 上检查：

```bash
sysctl net.ipv4.ip_forward
```

如果结果是：

```text
net.ipv4.ip_forward = 1
```

说明已经开启；否则就要进一步修改系统配置。

---

### 3. 回到服务端批准子网路由

客户端只是“宣告”了路由，Headscale 默认不会自动放行，所以还需要在 VPS 上手动批准。

先查看节点 ID：

```bash
sudo docker exec headscale headscale nodes list
```

然后依次批准：

```bash
# 例：批准群晖的 192.168.41.0/24
sudo docker exec headscale headscale nodes approve-routes -i 4 --routes "192.168.41.0/24"

# 例：批准极空间的 192.168.31.0/24
sudo docker exec headscale headscale nodes approve-routes -i 5 --routes "192.168.31.0/24"

# 例：批准某台 Ubuntu 的 10.0.0.0/24
sudo docker exec headscale headscale nodes approve-routes -i 20 --routes "10.0.0.0/24"

# 例：批准另一台 Ubuntu 的 10.0.4.0/24
sudo docker exec headscale headscale nodes approve-routes -i 18 --routes "10.0.4.0/24"
```

再检查状态是否已经生效：

```bash
sudo docker exec headscale headscale nodes routes list -i 4
sudo docker exec headscale headscale nodes routes list -i 5
```

只要看到对应路由的 `enabled` 为 `true`，说明这一步已经通过。

---

### 4. 最后做互通验证

例如：

```bash
# 在群晖上测试访问极空间所在网段
ping 192.168.31.x

# 在极空间上测试访问群晖所在网段
ping 192.168.41.x
```

如果你开启了 `MagicDNS`，也可以直接用主机名互访；如果没有，就先从虚拟 IP 和局域网 IP 两种方式分别测试。

---

## 九、排查思路

如果部署完还是不通，通常就卡在下面这几类问题里：

1. **`/dev/net/tun` 不存在**：尤其是 NAS，先确认 `TUN` 是否开启。
2. **服务端端口没放行**：`8022/tcp` 和 `3478/udp` 最容易漏。
3. **客户端没有注册成功**：看容器日志，确认有没有拿到注册链接。
4. **路由宣告了，但服务端没批准**：这是最常见的坑。
5. **宿主机没开 IP Forwarding**：导致看起来像“节点在线，但子网不通”。
6. **`TS_EXTRA_ARGS` 没带 `--accept-routes`**：节点会拒收其他站点的子网路由。

---

## 十、总结检查清单

![](/uploads/posts/headscale-xu-ni-zu-wang-shi-zhan/assets/deployment-checklist.png)

最终你可以按下面这份清单逐项确认：

1. **VPS**：`Headscale` 容器已正常运行，且服务端端口已经放行。
2. **VPS 自身**：也已作为 `Tailscale` 客户端成功接入网络。
3. **群晖 / 极空间 / Ubuntu**：客户端容器均正常运行，并完成注册。
4. **需要共享子网的节点**：已经正确设置 `TS_ROUTES`。
5. **服务端**：已经完成 `approve-routes`。
6. **站点互通**：可以直接 `ping` 对方局域网地址，或通过 `MagicDNS` 访问。

做到这一步之后，你手上的这些设备，基本就已经从“散落各地的机器”，变成了“同一张可控大局域网里的节点”。

如果只是日常远程访问设备，到这里其实已经很好用了；如果后面还想继续折腾 ACL、出口节点、MagicDNS 细分域名，那就是下一篇可以继续展开的话题了。
