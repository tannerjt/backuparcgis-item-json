const fs = require('fs')

function exists(path) {
  return new Promise(function (resolve, reject) {
    try {
      fs.exists(path, (exists) => {
        resolve(exists)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function readdir(path) {
  return new Promise(function (resolve, reject) {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err)
      }
      resolve([...files])
    })
  })
}

function stat(path) {
  return new Promise(function (resolve, reject) {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err)
      }
      resolve(stats)
    })
  })
}

function write(path, data) {
  return new Promise(function (resolve, reject) {
    const ws = fs.createWriteStream(path)
    ws.write(data)
    ws.on('finish', () => {
      resolve()
    })
    ws.on('error', (err) => {
      reject(err)
    })
    ws.end()
  })
}

module.exports = {
  exists,
  readdir,
  stat,
  write,
}