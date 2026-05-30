# Address Parse API

基于 [`address-smart-parse`](https://github.com/wzc570738205/smartParsePro) 封装的 HTTP API，用于识别中文收货地址中的省、市、区县、街道、详细地址、姓名、手机号、邮编和身份证号。

## 本地运行

```bash
npm install
npm start
```

默认监听 `http://localhost:3000`。

停止本地服务：

```bash
Ctrl+C
```

## 接口

### 健康检查

```http
GET /health
```

### 地址识别

```http
POST /parse
Content-Type: application/json

{
  "text": "陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810"
}
```

兼容路径：

```http
POST /smAddress
```

`/parse` 和 `/smAddress` 使用同一套解析逻辑，返回结果一致。新项目建议使用 `/parse`；已有调用方如果使用 `/smAddress`，可以继续保持不变。

可选参数：

- `includeStreet`: 默认为 `true`，使用包内置街道数据；传 `false` 时只按库默认省市区能力解析。

返回示例：

```json
{
  "success": true,
  "data": {
    "zipCode": "710061",
    "province": "陕西省",
    "provinceCode": "61",
    "city": "西安市",
    "cityCode": "6101",
    "county": "雁塔区",
    "countyCode": "610113",
    "street": "丈八沟街道",
    "streetCode": "610113007",
    "address": "高新四路高新大都荟",
    "name": "刘国良",
    "phone": "13593464918",
    "idCard": "211381198512096810"
  }
}
```

## Docker 部署

```bash
docker build -t address-parse-api .
docker run -d --name address-parse-api -p 3000:3000 address-parse-api
```

## Node 服务器部署

服务器建议使用 Node.js 20 或更高版本。

### 直接启动

```bash
git clone <your-repo-url> address-parse-api
cd address-parse-api
npm ci --omit=dev
PORT=3000 npm start
```

如果服务器上没有 Git，也可以把本项目目录上传到服务器后执行：

```bash
cd address-parse-api
npm ci --omit=dev
npm start
```

默认端口是 `3000`，可以通过 `PORT` 环境变量修改：

```bash
PORT=8080 npm start
```

### 使用 PM2 后台运行

生产环境建议使用 PM2 托管 Node 进程：

```bash
npm install -g pm2
cd address-parse-api
npm ci --omit=dev
pm2 start src/server.js --name address-parse-api --time
pm2 save
```

查看状态和日志：

```bash
pm2 status
pm2 logs address-parse-api
```

重启和停止：

```bash
pm2 restart address-parse-api
pm2 stop address-parse-api
```

配置开机自启：

```bash
pm2 startup
```

执行 `pm2 startup` 后，终端会输出一条需要复制执行的系统命令；执行完成后再运行：

```bash
pm2 save
```

### Nginx 反向代理示例

如果需要通过域名访问，可以用 Nginx 反向代理到本服务：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

部署完成后测试：

```bash
curl http://api.example.com/health
curl -X POST http://api.example.com/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918"}'
```

## 生产环境建议

- 用 Nginx/Caddy 做 HTTPS 和反向代理。
- 按业务需要加鉴权，例如 API Key、JWT 或内网访问控制。
- 如果接入公网，建议在网关层加限流。
