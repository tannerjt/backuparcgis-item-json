#!/usr/bin/env node

const axios = require('axios')
const querystring = require('querystring')
const fs = require('fs')
const fsPromises = require('./lib/fs-promise')
const crypto = require('crypto')

class BackupArcGISItem {

  constructor(itemId, dir, username, token) {

    if (!itemId || !dir || !username || !token) {
      throw new Error('4 Parameters Required (ItemID, Working Directory Path, Username, Token)')
    }

    // ArcGIS Online account for storing item
    this.username = username
    this.token = token

    // original item in arcgis
    this.itemUrl = `https://www.arcgis.com/home/item?id=${itemId}`
    this.itemId = itemId
    this.itemDescription = undefined
    this.itemData = undefined

    // storage 
    this.workingDir = dir.slice(-1) == '/' ? dir.slice(0, -1) : dir


    // versioning
    this.duplicate = false

  }

  // Given an itemId, return item details json
  // returns item details object
  async getItemDescription(itemId) {

    try {
      const response = await axios.get(`https://www.arcgis.com/sharing/rest/content/items/${itemId}?f=json&token=${this.token}`)
      if (response.data.error) {
        throw (response.data.error.message)
      }
      return response.data
    } catch (err) {
      process.exitCode = 1
      throw (err)
    }

  }

  async getItemData(itemId) {

    try {
      const response = await axios.get(`https://www.arcgis.com/sharing/rest/content/items/${itemId}/data?f=json&token=${this.token}`)
      if (response.data.error) {
        throw (response.data.error.message)
      }
      return response.data
    } catch (err) {
      process.exitCode = 1
      throw (err)
    }

  }

  async compareLatest(itemId, tmpHash) {

    // get latest file in directory
    const files = await fsPromises.readdir(`${this.workingDir}/archive/${itemId}`)
    files.sort()
    const latest = files[files.length - 1]
    const latestHash = await hashFile(`${this.workingDir}/archive/${itemId}/${latest}`, handleErr)
    if(tmpHash === latestHash) {
        return true
    }
    return false

  }

  async writeTmpFile(path, data) {

    try {
      await fsPromises.write(path, data)
      const tmpHash = await hashFile(path)
      return tmpHash
    } catch (err) {
        console.log(err)
        process.exitCode = 1
    }
    
  }
   
  async run() {

    // check for archive and tmp directory
    const archiveExists = await fsPromises.exists(`${this.workingDir}/archive`)
    if (!archiveExists) {
      await fs.mkdir(`${this.workingDir}/archive`, (err) => {
        if (!(err && err.code === 'EEXIST')) {
          handleErr(err)
        }
      })
    }

    const tmpExists = await fsPromises.exists(`${this.workingDir}/archive/tmp`)
    if (!tmpExists) {
      await fs.mkdir(`${this.workingDir}/archive/tmp`, (err) => {
        if (!(err && err.code === 'EEXIST')) {
          handleErr(err)
        }
      })
    }

    this.itemDescription = await this.getItemDescription(this.itemId)
    this.itemDescription.numViews = 0 // the only value that will change over time
    this.itemData = await this.getItemData(this.itemId)

    const combined = {
      'description': this.itemDescription,
      'data': this.itemData,
    }

    const tmpPath = `${this.workingDir}/archive/tmp/${this.itemId}.json`
    const tmpHash = await this.writeTmpFile(tmpPath, JSON.stringify(combined))

    const pathExists = await fsPromises.exists(`${this.workingDir}/archive/${this.itemId}`)
    const outFileName = `${this.workingDir}/archive/${this.itemId}/${Date.now()}.json`
  
    if (pathExists) {
      // path already exists, check file sizes
      const exists = await this.compareLatest(this.itemId, tmpHash)
      if (!exists) {
        await fs.rename(tmpPath, outFileName, handleErr)
      } else {
        // no updates to file, duplicate
        this.duplicate = true
        await fs.unlink(tmpPath, handleErr)
      }
    } else {
      // async version is causing issues
      fs.mkdirSync(`${this.workingDir}/archive/${this.itemId}`, handleErr)
      await fs.rename(tmpPath, outFileName, handleErr)
    }

    return {
      filename: this.duplicate ? false : outFileName,
      itemDetails: this.itemDescription,
      duplicate: this.duplicate
    }

  }
}

function handleErr(err) {

  if (err) throw err

}


function hashFile(path) {

  return new Promise(function (resolve, reject) {
      const hash = crypto.createHash('sha256')
      const input = fs.createReadStream(path)
      input.on('readable', () => {
          const data = input.read()
          if(data) {
              hash.update(data)
          } else {
              resolve(hash.digest('hex'))
          }
      })
      input.on('error', (err) => {
          reject(err)
      })
  })
    
}

if (require.main == module) {

  // if run as node process
  if (process.argv.length < 6) {
    console.log('ArcGIS Item URL, working directory path, username, and token required')
    console.log('example: backuparcgis-item https://www.arcgis.com/home/item.html?id=c31146ae5a7d4299a08dd4407526625d ./ {username} {token}')
    process.exitCode = 1
    return
  }

  const backup = new BackupArcGISItem(process.argv[2], process.argv[3], process.argv[4], process.argv[5])
  backup.run().then((resp) => {
    if (!resp.duplicate) {
      console.log(`${resp.itemDetails.title} completed: ${resp.filename}`)
    } else {
      console.log(`No updates to ${resp.itemDetails.title}.`)
    }
  }).catch((err) => {
    console.log(err)
  })
} else {
  // if run by require()
  module.exports = BackupArcGISItem
}