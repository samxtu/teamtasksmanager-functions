const {admin} = require('./admin');
const firebaseConfig = require('./config');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = (req, res, next) => {
 
    const busboy = new Busboy({
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024,
      }
    });
  
    const files = [];
    let debody = {};
    let dataTempName = '';
    const fileWrites = [];
    const tmpdir = os.tmpdir();
  
    // busboy.on('field', (key, value) => {
    //   fields[key] = value;
    // });
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const tempName = `${new Date().getTime()}${filename}`;
      const filepath = path.join(tmpdir, tempName);
      console.log(`Handling file upload field ${fieldname}: ${filename} (${filepath})`);
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
  
      fileWrites.push(new Promise((resolve, reject) => {
        file.on('end', () => writeStream.end());
        writeStream.on('finish', () => {
          fs.readFile(filepath, (err, buffer) => {
            const size = Buffer.byteLength(buffer);
            console.log(`${filename} is ${size} bytes`);
            if (err) {
              return reject(err);
            }
            if(mimetype === 'application/json'){
             debody = require(`/tmp/${tempName}`);
             dataTempName = tempName;
            } else {
            files.push({
              tempName,
              originalname: filename,
              mimetype,
              size,
              filepath
            });
  
          }
            resolve();
          });
        });
        writeStream.on('error', reject);
      }));
    });
  
    busboy.on('finish', () => {
      Promise.all(fileWrites)
        .then(() => {
        var promise1 = new Promise((resolve, reject) => {
          
          files.forEach((fl,i)=>{
            admin.storage().bucket().upload(fl.filepath,{
                resumable: false,
                metadata:{
                    metadata:{
                        contentType: fl.mimetype
                    }
                }
            })
            .catch((err)=>{
                console.error(err);
                return res.status(500).json({ error: err.code });
            })
            
            const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket.trim()}/o/${fl.tempName}?alt=media`;
            files[i] =
                {
                    ...fl,
                    createdAt: new Date().toISOString(),
                    url: fileUrl
                }
            try {
              fs.unlinkSync(fl.filepath);
              } catch (error) {
              return reject(error);
              }
            if(i+1 == files.length){
              resolve()
            }
        })

        });
        
        promise1.then(() => {
          req.body = debody;
          req.files = files;
          // try {
          //   fs.unlinkSync(`/tmp/${dataTempName}`);
          // } catch (error) {
          //   return console.error(error);
          // }
          next();
        });
        })
        .catch(next);
    });
  
    busboy.end(req.rawBody);
  }