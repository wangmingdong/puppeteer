可进行懒加载截图，如淘宝、京东，上传七牛云并返回图片地址

### 安装环境
``` bash
npm install
```

### 本地启动
``` bash
npm run start
```

### PM2启动
``` bash
pm2 start ./bin/www --name="puppeteer"
```

### 使用
http://localhost:8001/screenshot?url=http://www.taobao.com

### 在线
http://148.70.56.11:8001/screenshot?url=http://www.taobao.com