
const qiNiuConfig = require('./../config.js')
const path = require('path')
const fs = require('fs')
const Busboy = require('busboy')
const qiniu = require('qiniu')

// 写入目录
const mkdirsSync = (dirname) => {
    if (fs.existsSync(dirname)) {
      return true
    } else {
      if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
      }
    }
    return false
  }
  
  function getSuffix (fileName) {
    return fileName.split('.').pop()
  }
  
  // 重命名
  function Rename () {
    let currentDate = new Date()
    let currentMon = currentDate.getMonth() + 1 + ''
    let currentDay = currentDate.getDate() + ''
    if (currentMon.length < 2) {
      currentMon = '0' + currentMon
    }
    if (currentDay.length < 2) {
      currentDay = '0' + currentDay
    }
    return `screenshot_${currentDate.getFullYear()}${currentMon}${currentDay}${Math.random().toString(16).substr(2)}.jpeg`
  }

  // 删除文件
  function removeTemImage (path) {
    fs.unlink(path, (err) => {
      if (err) {
        throw err
      }
    })
  }
  // 上传到七牛
  function upToQiniu (filePath, key) {
    const accessKey = qiNiuConfig.qiNiu.accessKey 
    const secretKey = qiNiuConfig.qiNiu.secretKey 
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
  
    const options = {
      scope: qiNiuConfig.qiNiu.scope 
    }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    const uploadToken = putPolicy.uploadToken(mac)
  
    const config = new qiniu.conf.Config()
    // 空间对应的机房
    config.zone = qiniu.zone.Zone_z0
    const localFile = filePath
    const formUploader = new qiniu.form_up.FormUploader(config)
    const putExtra = new qiniu.form_up.PutExtra()
    // 文件上传
    return new Promise((resolved, reject) => {
      formUploader.putFile(uploadToken, key, localFile, putExtra, function (respErr, respBody, respInfo) {
        if (respErr) {
          reject(respErr)
        }
        if (respInfo && respInfo.statusCode == 200) {
          resolved(respBody)
        } else {
          resolved(respBody)
        }
      })
    })
  
  }
  
  // 上传到本地服务器
  function uploadFile (req, options) {
    const _emmiter = new Busboy({headers: req.headers})
    const fileType = options.fileType
    const filePath = path.join(options.path, fileType)
    const confirm = mkdirsSync(filePath)
    if (!confirm) {
      return
    }
    console.log('start uploading...')
    return new Promise((resolve, reject) => {
      _emmiter.on('file', function (fieldname, file, filename, encoding, mimetype) {
        const fileName = Rename(filename)
        const saveTo = path.join(path.join(filePath, fileName))
        file.pipe(fs.createWriteStream(saveTo))
        file.on('end', function () {
          resolve({
            imgPath: `/${fileType}/${fileName}`,
            imgKey: fileName
          })
        })
      })
  
      _emmiter.on('finish', function () {
        console.log('finished...')
      })
  
      _emmiter.on('error', function (err) {
        console.log('err...')
        reject(err)
      })
  
      ctx.req.pipe(_emmiter)
    })
  }
 
module.exports = {
    uploadFile: uploadFile,
    upToQiniu: upToQiniu,
    removeTemImage: removeTemImage,
    rename: Rename
};
