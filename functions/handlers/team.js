const { db, admin } = require("../util/admin");
const getTask = require("../util/taskGetter");

exports.getTeamMember = (req, res) => {
    let resData = {};
    db.doc(`/users/${req.params.userHandle}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          resData.credentials = doc.data();
          return db
            .collection(`users`)
            .doc(doc.id)
            .collection(messages)
            .where("userHandle","==",req.user.handle)
            .get();
        }
      })
      .then((msgs)=>{
        resData.messages = [];
        msgs.forEach(msg => {
          resData.messages.push(msg.data());
        })
        return  db
        .collection(`users`)
        .doc(req.user.handle)
        .collection(messages)
        .where("userHandle","==",req.params.userHandle)
        .get();
      })
      .then((txts)=>{
        resData.messages = [];
        txts.forEach(txt => {
          resData.messages.push(txt.data());
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
          resData.sharedTasks = []
          picsRef.forEach(picref => {
              picref.ref.parent.get().then(pics => {
                  pics.forEach(pic=>{
                      if(pic.data().handle == req.user.handle){
                        new Promise((resolve, reject) => {
                            resolve(getTask(picref.ref.parent.parent.id, req.params.taskStatus))
                          })
                          .then((value) => {
                            if(value){
                                resData.sharedTasks.push(value)
                            }
                          })
                          .catch(error =>{
                              console.error(error)
                              return res.status(500).json({ error: "Something went wrong" })
                          })
                      }
                  })
                  return picref.ref.parent.parent.collection("supervisors").get()
              })
              .then(sups=>{
                sups.forEach(sup=>{
                    if(sup.data().handle == req.user.handle){
                      new Promise((resolve, reject) => {
                          resolve(getTask(sup.ref.parent.parent.id, req.params.taskStatus))
                        })
                        .then((value) => {
                          if(value){
                              resData.sharedTasks.push(value)
                          }
                        })
                        .catch(error =>{
                            console.error(error)
                            return res.status(500).json({ error: "Something went wrong" })
                        })
                    }
                })
              })
              .catch(error =>{
                  console.error(error)
                  return res.status(500).json({ error: "Something went wrong" })
              })
          })
          return  db
          .collectionGroup("supervisors")
          .where("handle","==",req.params.userHandle)
          .get()
      })
      .then((supsRef)=>{
          resData.sharedTasks = []
          supsRef.forEach(supref => {
              supref.ref.parent.get().then(supers => {
                  supers.forEach(superData=>{
                      if(superData.data().handle == req.user.handle){
                        new Promise((resolve, reject) => {
                            resolve(getTask(supref.ref.parent.parent.id, req.params.taskStatus))
                          })
                          .then((val) => {
                            if(val){
                                resData.sharedTasks.push(val)
                            }
                          })
                          .catch(error =>{
                              console.error(error)
                              return res.status(500).json({ error: "Something went wrong" })
                          })
                      }
                  })
                  return supref.ref.parent.parent.collection("PIC").get()
              })
              .then(picMembers=>{
                picMembers.forEach(pc=>{
                    if(pc.data().handle == req.user.handle){
                      new Promise((resolve, reject) => {
                          resolve(getTask(pc.ref.parent.parent.id, req.params.taskStatus))
                        })
                        .then((vl) => {
                          if(vl){
                              resData.sharedTasks.push(vl)
                          }
                        })
                        .catch(error =>{
                            console.error(error)
                            return res.status(500).json({ error: "Something went wrong" })
                        })
                    }
                })
              })
              .catch(error =>{
                  console.error(error)
                  return res.status(500).json({ error: "Something went wrong" })
              })
          })
          return true
      })
      .then(()=>{
          return res.status(200).json({ resData })
      })
      .catch(err => {
        res.status(200).json(resData);
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
              if(doc.id != system) team.push(doc.data())
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