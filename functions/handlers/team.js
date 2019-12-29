const { db, admin } = require("../util/admin");
const { getTask }  = require("../util/taskGetter");

exports.getTeamMember = (req, res) => {
    let resData = {};
    resData.sharedTasks = []
    resData.messages = [];
    db.doc(`/users/${req.params.userHandle}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          resData.credentials = doc.data();
          return db
            .collectionGroup("messages")
            .where("userHandle","==",req.user.handle)
            .get();
        }
      })
      .then((msgs)=>{
        console.log(`${req.user.handle}`)
        msgs.forEach(msg => {
            if(msg.ref.parent.parent.id == req.params.userHandle) resData.messages.push(msg.data());
        })
        return  db
        .collectionGroup("messages")
        .where("userHandle","==",req.params.userHandle)
        .get();
      })
      .then((txts)=>{
          console.log(`${req.params.userHandle}`)
        txts.forEach(txt => {
           if(txt.ref.parent.parent.id == req.user.handle) resData.messages.push(txt.data());
        })
        return true;
      })
      .then(()=>{
          resData.messages.sort((a,b)=>{
            const bandA = a.createdAt;
            const bandB = b.createdAt;
          
            let comparison = 0;
            if (bandA > bandB) {
              comparison = 1;
            } else if (bandA < bandB) {
              comparison = -1;
            }
            return comparison;
          })
          return db
                    .collectionGroup("PIC")
                    .where("handle","==",req.params.userHandle)
                    .get()
      })
      .then((picsRef)=>{
          let picsrefarray = []
          let picsarray = []
          picsRef.forEach(picref => {
            picsarray.push( new Promise((resolve, reject) => {
                resolve(
              picref.ref.parent.get().then(pics => {
                  pics.forEach(async pic=>{
                      if(pic.data().handle == req.user.handle){
                        console.log("got one")
                        picsrefarray.push( new Promise(async (resolve, reject) => {
                              await getTask(pic.ref.parent.parent.id, req.params.taskStatus)
                              .then((theTask)=>{
                                console.log("The task found is this"+pic.ref.parent.parent.id)
                                resData.sharedTasks.push(theTask)
                                console.log(theTask)
                              resolve(theTask)
                              })
                          }))
                      }
                  })
                  return Promise.all(picsrefarray).then(()=>{
                    return picref.ref.parent.parent.collection("supervisors").get()
                  })
              })
              .then(sups=>{
                let supsrefarray = []
                sups.forEach(async sup=>{
                    if(sup.data().handle == req.user.handle){
                     supsrefarray.push( new Promise(async (resolve, reject) => {
                            console.log("The task found is this"+sup.ref.parent.parent.id)
                            await getTask(sup.ref.parent.parent.id, req.params.taskStatus)
                            .then((theTask)=>{
                                resData.sharedTasks.push(theTask)
                                console.log(theTask)
                              resolve(theTask)
                            })
                        }))
                    }
                }) 
               return Promise.all(supsrefarray).then(()=>{
                  return true
                })
              })
              .catch(error =>{
                  console.error(error)
                  return res.status(500).json({ error: "Something went wrong" })
              })
            )}))
          })
          return Promise.all(picsarray).then(()=>{
            console.log(resData.sharedTasks)
            return  db
            .collectionGroup("supervisors")
            .where("handle","==",req.params.userHandle)
            .get()
           })
      })
      .then((supsRef)=>{
          let suprefarray = []
          let supsarray = []
          supsRef.forEach(supref => {
            supsarray.push( new Promise((resolve, reject) => {
                resolve(
              supref.ref.parent.get().then(supers => {
                  supers.forEach(async superData=>{
                      if(superData.data().handle == req.user.handle){
                        suprefarray.push(new Promise(async (resolve, reject) => {
                                console.log("The task found is this"+supref.ref.parent.parent.id)
                              await getTask(supref.ref.parent.parent.id, req.params.taskStatus)
                              .then((theTask)=>{
                                resData.sharedTasks.push(theTask)
                                console.log(theTask)
                              resolve(theTask)
                              })
                          }))
                      }
                  })
                  return Promise.all(suprefarray).then(()=>{
                    return supref.ref.parent.parent.collection("PIC").get()
                  })
              })
              .then(picMembers=>{
                let picrefarray = []
                picMembers.forEach(async pc=>{
                    if(pc.data().handle == req.user.handle){
                     picrefarray.push( new Promise(async (resolve, reject) => {
                            console.log("The task found is this"+pc.ref.parent.parent.id)
                          await getTask(pc.ref.parent.parent.id, req.params.taskStatus)
                          .then((theTask)=>{
                            console.log(theTask)
                            resData.sharedTasks.push(theTask)
                          resolve(theTask)
                          })
                        }))
                    }
                })
                return Promise.all(picrefarray).then(()=>{
                  return true
                })
              })
              .catch(error =>{
                  console.error(error)
                  return res.status(500).json({ error: "Something went wrong" })
              })
            )}))
          })
          return Promise.all(supsarray).then(()=>{
            console.log(resData.sharedTasks)
            return true
          })
      })
      .then(()=>{
          console.log(resData)
          return res.status(200).json({ resData })
      })
      .catch(err => {
        console.error(err);
        return res.status(400).json({ error: err.code });
      });
  };
  
  exports.getTeamMembers = (req, res) => {
    let team = [];
    db.collection(`users`)
      .get()
      .then(docs => {
        if (docs.size != 0) {
          docs.forEach(doc=>{
              if(doc.id != "system") team.push(doc.data())
          })
        }
      })
      .then(()=>{
          return res.status(200).json({team: team});
      })
      .catch(err => {
        console.error(err);
        return res.status(400).json({ error: err.code });
      });
  };