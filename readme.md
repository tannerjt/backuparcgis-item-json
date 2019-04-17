## backuparcgis-item-json
backuparcgis-item-json is a nodejs library used to backup web map and app JSON from ArcGIS Online (hosted feature services) to disk.

## Features

### Asynchronous 

backuparcgis-item-json is asynchronous and returns a promise when complete.

### Versioned

backuparcgis-item-json only stores a backup of the JSON configurations if changes has been made.

### Streaming

backuparcgis-item-json streams feature service content directly to a file and does not store it in memory.  This allows the script to run faster and avoid memory issues with larger datasets.

## Use require()

```bash
$ npm install backuparcgis-item-json
```

```javascript
const BackupArcGISService = require('backuparcgis-item-json')

// new BackupArcGIS(itemId, archiveDirectory, username, ?token)
const Backup = new BackupArcGISService('682fac79087c4e159962444de9b823c5', outDir, username, token)

Backup.run().then((resp) => {
    if(!resp.duplicate) {
        console.log(`${resp.serviceDetails.title} completed: ${resp.filename}`)
    } else {
        console.log(`No updates to ${resp.serviceDetails.title}.`)
    }
})
```

## Run from command line

```bash
$ npm install backuparcgis-item-json --global
```

**Format:**

*backuparcgis-item-json serviceUrl archiveDirectory ?username ?token*

```bash
#!/bin/bash

backuparcgis-item 682fac79087c4e159962444de9b823c5 ./terminal john.appleseed jkfdla9udfajklsafjda9eu232-fds_fjdsla..
```

## Response

The library will respond with a promise with the following object:

```json
{
    "duplicate": "boolean",
    "itemDetails": "object",
    "filename": "string"
}
```

## File Storage Format

A new archive directory will be created in your specified output directory.  Within the archive directory, a new folder will be created for each item, which is named the same as the item id in ArcGIS Online.  Data will be versioned by timestamp, only storing new datasets that are different from the previous export (sha256 hash comparisons).  

```
archive  
└───arcgis_item_id
    │--timestamp.json
    │--timestamp.json
```

## File Contents

Files will contain both JSON configuration `description` and `data` required for web maps and apps.