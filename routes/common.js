var express = require('express');
var router = express.Router();
const puppeteer = require('puppeteer');
const QiNiuUploadCtrl = require('./../utils/qiNiuUpload');
const qiNiuConfig = require('./../config.js')
const path = require('path')

/* GET listing. */
router.get('/', function(req, res, next) {
    // 截图的网页
    let request_url = req.query.url
    if (!request_url) {
        res.json({
            code: 0,
            data: {
                result: false,
                msg: 'url未定义'
            }
        })
        return
    }
  (async () => {
    // 启动Chromium
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'], // 解决node服务器部署报错：Running as root without --no-sandbox is not supported
        headless: true  // 解决截图汉字乱码问题
    });
    // const browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless:false, args: ['--no-sandbox']});
    // 打开新页面
    const page = await browser.newPage();
    // 设置页面分辨率
    await page.setViewport({width: 1920, height: 1080});

    // 访问
    await page.goto(request_url, {waitUntil: 'domcontentloaded'}).catch(err => {
        console.log(err)
        res.json({
            code: 0,
            data: {
                result: false,
                msg: 'url无法打开,注意增加http或https前缀,如：https://www.baidu.com'
            }
        })
        return
    });
    await page.waitFor(1000);
    let title = await page.title();
    console.log(title);

    // 网页加载最大高度
    const max_height_px = 20000;
    // 滚动高度
    let scrollStep = 1080;
    let height_limit = false;
    let mValues = {'scrollEnable': true, 'height_limit': height_limit};

    while (mValues.scrollEnable) {
        mValues = await page.evaluate((scrollStep, max_height_px, height_limit) => {

            // 防止网页没有body时，滚动报错
            // document.documentElement
            if (document.scrollingElement) {
                let scrollTop = document.scrollingElement.scrollTop;
                document.scrollingElement.scrollTop = scrollTop + scrollStep;

                if (null != document.body && document.body.clientHeight > max_height_px) {
                    height_limit = true;
                } else if (document.scrollingElement.scrollTop + scrollStep > max_height_px) {
                    height_limit = true;
                }

                let scrollEnableFlag = false;
                if (null != document.body) {
                    scrollEnableFlag = document.body.clientHeight > scrollTop + 1081 && !height_limit;
                } else {
                    scrollEnableFlag = document.scrollingElement.scrollTop + scrollStep > scrollTop + 1081 && !height_limit;
                }

                return {
                    'scrollEnable': scrollEnableFlag,
                    'height_limit': height_limit,
                    'document_scrolling_Element_scrollTop': document.scrollingElement.scrollTop
                };
            }

        }, scrollStep, max_height_px, height_limit);

        await sleep(800);
    }

    try {
        const fileName = QiNiuUploadCtrl.rename()
        await page.screenshot({path: `./routes/uploads/${fileName}`, fullPage:true}).catch(err => {
            console.log('截图失败');
            console.log(err);
            res.json({
                code: 0,
                data: {
                    result: false,
                    msg: '截图失败'
                }
            })
        });
        await page.waitFor(1000);
        const serverPath = path.join(__dirname, './uploads/')
        const imgPath = path.join(serverPath, `./${fileName}`)
        // 上传到七牛
        const qiniu = await QiNiuUploadCtrl.upToQiniu(imgPath, fileName)
        // 上存到七牛之后 删除原来的缓存图片
        QiNiuUploadCtrl.removeTemImage(imgPath)
        let qiNiuUrl = ''
        if (qiniu && qiniu.key) {
            qiNiuUrl = `http://${qiNiuConfig.qiNiu.prefixUrl}/${qiniu.key}`
        }
        res.json({
            code: 0,
            data: {
                result: true,
                file_url: qiNiuUrl
            }
        })

    } catch (e) {
        console.log('执行异常');
        res.json({
            code: 0,
            data: {
                result: false,
                msg: '执行异常'
            }
        })
    } finally {
        await browser.close();
    }

})();

//延时函数
function sleep(delay) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(1)
            } catch (e) {
                reject(0)
            }
        }, delay)
    })
}
})

module.exports = router;
