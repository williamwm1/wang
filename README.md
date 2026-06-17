# 提货管理系统 / Pickup Management (Square 对接)

仓库管理员用的提货应用，对接 Square：自动读取发票(invoice)的**付款状态**、**提货进度（已提/剩余）**、**实时库存**，并记录**退换货**、**提货人电子签名**、**提货日期时间**、**货物名称与数量**。所有员工通过登录共享同一份数据，任何人的修改其他人**实时**可见。

A pickup app for warehouse staff, integrated with Square. It reads invoice
payment status, pickup progress (picked / remaining), and live inventory from
Square, and records returns/exchanges, e-signatures, pickup date/time, and item
names & quantities. All staff share the same data through login; changes appear
in real time for everyone.

---

## 功能 / Features

- **发票 / 提货**：从 Square 读取发票列表，显示付款状态（已付/未付/部分）与提货状态（未提/部分/已提完）。点开发票可逐项登记提货、电子签名、提货人、日期时间、备注；自动计算每项**剩余未提数量**。
- **库存**：从 Square 实时读取每个商品的库存数量。
- **退换货**：登记退货 / 换货，含原因、经办人、货物明细，可关联发票。
- **操作记录**：谁、什么时候、做了什么的审计日志。
- **员工管理**（管理员）：新建账号、启用/停用、重置密码。
- **实时协作**：任何人保存后，所有在线员工的页面自动刷新（Socket.IO）。
- **中英双语**：右上角一键切换。

---

## 快速开始 / Quick start

需要 Node.js 18 或更高版本 / Requires Node.js 18+.

```bash
# 1. 安装依赖 / Install dependencies
npm install

# 2. 复制配置文件并填写 / Copy config and fill it in
cp .env.example .env
#   编辑 .env，填入：
#   JWT_SECRET           一长串随机字符
#   SQUARE_ACCESS_TOKEN  你的 Square access token
#   SQUARE_ENVIRONMENT   production 或 sandbox
#   SQUARE_LOCATION_ID   你的门店 location id

# 3. 创建第一个管理员账号 / Create the first admin account
npm run init-admin
#   也可一行带参数: npm run init-admin -- admin@store.com "Admin" yourpassword

# 4. 启动 / Start
npm start
#   打开 http://localhost:3000
```

启动后用管理员账号登录，在「员工管理」里给每位同事建账号，他们就能各自登录、共享数据。

---

## 获取 Square 凭证 / Getting Square credentials

1. 登录 <https://developer.squareup.com/apps>，进入（或新建）你的应用。
2. 在 **Credentials** 页复制 **Access Token**（正式数据用 *Production*，测试用 *Sandbox*）填入 `SQUARE_ACCESS_TOKEN`，并把 `SQUARE_ENVIRONMENT` 设为 `production` 或 `sandbox`。
3. 在 **Locations** 页复制 **Location ID** 填入 `SQUARE_LOCATION_ID`。
4. Token 至少需要这些权限范围 / The token needs these scopes：
   `INVOICES_READ`, `ORDERS_READ`, `ITEMS_READ`, `INVENTORY_READ`,
   `MERCHANT_PROFILE_READ`, `CUSTOMERS_READ`.

> 安全提示：`.env` 已被 `.gitignore` 忽略，请勿把 Access Token 提交到仓库。

---

## 部署到云端 / Deploying to the cloud

应用是标准的 Node 服务，可部署到任意支持 Node 的平台（Render、Railway、Fly.io、
自有 VPS 等）。仓库已附带 `Dockerfile` 和 Render 蓝图 `render.yaml`。

### 方式 A：Render（推荐，最省心）

1. 在 Render 选择 **New → Blueprint**，连接此仓库；它会读取 `render.yaml`
   自动建好 Web 服务和 1GB 持久化磁盘（挂载在 `/data`，SQLite 数据库存这里）。
2. 在 Render 控制台填入 `SQUARE_ACCESS_TOKEN` 和 `SQUARE_LOCATION_ID`
   （`JWT_SECRET` 已自动生成）。
3. 首次部署完成后，在 Render 的 **Shell** 里运行一次 `npm run init-admin`
   创建管理员账号。
4. 打开 Render 给的 `https://...onrender.com` 网址即可，所有员工共用这个网址。

### 方式 B：Docker（自有服务器 / 其他平台）

```bash
docker build -t pickup-app .
docker run -d -p 3000:3000 \
  -e JWT_SECRET="一长串随机字符" \
  -e SQUARE_ACCESS_TOKEN="..." \
  -e SQUARE_ENVIRONMENT="production" \
  -e SQUARE_LOCATION_ID="..." \
  -v pickup-data:/data \
  --name pickup-app pickup-app
# 创建管理员: docker exec -it pickup-app npm run init-admin
```

### 通用要点 / Notes

- `JWT_SECRET` 务必设为强随机值。
- SQLite 数据库文件由 `DB_PATH` 指定，必须挂载到**持久化磁盘/卷**，否则重启丢数据。
  门店规模下 SQLite 足够；如需更高并发可改用 PostgreSQL（数据访问集中在
  `server/db.js`，便于替换）。
- 平台通常通过 `PORT` 环境变量指定端口，本应用已支持。
- 建议放在 HTTPS 之后（多数平台默认提供）。健康检查路径：`/api/config`。

---

## 技术结构 / Architecture

```
server/
  index.js            Express + Socket.IO 入口
  config.js           读取 .env
  db.js               SQLite 表结构与连接
  auth.js             登录 / JWT / 权限中间件
  square.js           Square REST API 封装（发票/订单/库存）
  routes/             auth, invoices, pickups, returns, inventory, users, activity
  scripts/create-admin.js   创建管理员
public/
  index.html, css/, js/     免构建的双语单页前端 + 签名画板
```

数据来源 / Data sources：
- **发票、订单明细、库存** → 实时来自 Square。
- **提货记录、签名、退换货、账号、审计日志** → 存在本应用数据库。
- 「剩余未提数量」= Square 订单数量 − 本应用已登记的提货数量。
