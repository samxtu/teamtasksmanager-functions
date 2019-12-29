const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");
const taskFiles = require("./util/filesUpload");
const { db, admin } = require("./util/admin");
const {
  signup,
  login,
  uploadProfileImage,
  sendMessage,
  changeOndutyStatus,
  getAuthenticatedUser,
  allowAddingUsers,
  denyAddingUsers
} = require("./handlers/users");
const {
  getTeamMember,
  getTeamMembers
} = require("./handlers/team");
const {
  postTask,
  getTask,
  getTasks,
  addFilesToTaskResponse,
  postTaskResponse,
  postResponseResponse,
  postCommentToTask,
  postCommentToTaskResponse,
  postCommentToResponseResponse,
  changeTaskStatus,
  changeTaskDeadline,
  editTask,
  editTaskResponse,
  editResponseResponse,
  addFilesToTask,
  addFilesToResponseResponse,
  deleteResponseResponse,
  deleteResponseResponseComment,
  deleteTaskComment,
  deleteTaskResponse,
  deleteTaskResponseComment,
  addPICS,
  addSupervisors,
  removePICS,
  removeSupervisors
} = require("./handlers/tasks");

//team routes
app.get("/team", FBAuth, getTeamMembers);

app.get("/team/:userHandle/:taskStatus", FBAuth, getTeamMember);

//user routes
app.post("/signup", FBAuth, signup);

app.post("/login", login);

app.post("/user/image", FBAuth, uploadProfileImage);

app.post("/changeonduty/:userHandle", FBAuth, changeOndutyStatus);

app.post("/sendmessage/:userHandle", FBAuth, sendMessage);

app.get("/user", FBAuth, getAuthenticatedUser);

app.get("/allowadduser/:userHandle", FBAuth, allowAddingUsers);

app.get("/denyadduser/:userHandle", FBAuth, denyAddingUsers);

// task routes

app.post("/teamtask", FBAuth, taskFiles, postTask);

app.get("/task/:taskId", FBAuth, getTask);

app.get("/tasks/:taskStatus", FBAuth, getTasks);

app.post("/taskfiles/:taskId", FBAuth, taskFiles, addFilesToTask);

app.post("/commenttotask", FBAuth, postCommentToTask);

app.post("/edittaskstatus/:taskId", FBAuth, changeTaskStatus);

app.post("/edittaskdeadline/:taskId", FBAuth, changeTaskDeadline);

app.delete("/deletetaskcomment/:taskId/:commentId", FBAuth, deleteTaskComment);

app.post("/edittask/:taskId", FBAuth, editTask);

app.post("/addpics/:taskId", FBAuth, addPICS);

app.post("/addsupervisors/:taskId", FBAuth, addSupervisors);

app.post("/removepics/:taskId", FBAuth, removePICS);

app.post("/removesupervisors/:taskId", FBAuth, removeSupervisors);

//task response routes

app.post(
  "/taskresponsefiles/:taskId/:taskResponseId",
  FBAuth,
  taskFiles,
  addFilesToTaskResponse
);

app.post("/teamtaskresponse", FBAuth, taskFiles, postTaskResponse);

app.post("/commenttotaskresponse", FBAuth, postCommentToTaskResponse);

app.post("/edittaskresponse/:taskId/:taskResponseId", FBAuth, editTaskResponse);

app.delete(
  "/deletetaskresponse/:taskId/:taskResponseId",
  FBAuth,
  deleteTaskResponse
);

app.delete(
  "/deletetaskresponsecomment/:taskId/:taskResponseId/:commentId",
  FBAuth,
  deleteTaskResponseComment
);

//task response response routes

app.post("/taskresponseresponse", FBAuth, taskFiles, postResponseResponse);

app.post(
  "/responsefiles/:taskId/:taskResponseId/:responseResponseId",
  FBAuth,
  taskFiles,
  addFilesToResponseResponse
);

app.post("/commenttoresponseresponse", FBAuth, postCommentToResponseResponse);

app.delete(
  "/deleteresponseresponse/:taskId/:taskResponseId/:responseResponseId",
  FBAuth,
  deleteResponseResponse
);

app.post(
  "/editresponseresponse/:taskId/:taskResponseId/:responseResponseId",
  FBAuth,
  editResponseResponse
);

app.delete(
  "/deleteresponseresponsecomment/:taskId/:taskResponseId/:responseResponseId/:commentId",
  FBAuth,
  deleteResponseResponseComment
);

exports.api = functions.https.onRequest(app);

exports.notificationsOnTaskAdd = functions.firestore
  .document("tasks/{id}")
  .onCreate((snapshot, context) => {
    let suparrayref = [];
    let picarrayref = [];
    let batches = [];
    let bc = 0;
    console.log(snapshot.id);
    db.collection("tasks")
      .doc(context.params.id)
      .collection("PIC")
      .get()
      .then(picslist => {
        let q = 0;
        picslist.forEach(picdata => {
          batches[bc] = db.batch();
          picarrayref.push(
            db
              .collection("users")
              .doc(picdata.data().handle)
              .collection("notifications")
              .doc()
          );
          batches[bc].set(picarrayref[q], {
            createdAt: new Date().toISOString(),
            read: false,
            sender: snapshot.data().userHandle,
            imageUrl: snapshot.data().imageUrl,
            type: "task",
            action: "created",
            typeId: snapshot.id
          });
          q++;
          bc++;
        });
        return db
          .collection("tasks")
          .doc(snapshot.id)
          .collection("supervisors");
      })
      .then(supslist => {
        if (supslist.size > 1) {
          let w = 0;
          supslist.forEach(supdata => {
            batches[bc] = db.batch();
            if (supdata.data().handle !== snapshot.data().userHandle) {
              suparrayref.push(
                db
                  .collection("users")
                  .doc(supdata.data().handle)
                  .collection("notifications")
                  .doc()
              );
              batches[bc].set(suparrayref[w], {
                createdAt: new Date().toISOString(),
                read: false,
                sender: snapshot.data().userHandle,
                imageUrl: snapshot.data().imageUrl,
                type: "task",
                action: "created",
                typeId: snapshot.id
              });
              w++;
              bc++;
            }
          });
        }
        return true;
      })
      .then(() => {
        batches.forEach(batch => {
          batch.commit();
        });
        return true;
      })
      .catch(err => {
        console.error(err);
        return true;
      });
  });

exports.notificationsOnTaskUpdate = functions.firestore
  .document(
    "tasks/{id}/{subcollection}/{subcollectiondocid}/{minisubcollection}/{minisubid}/{deepminisub}/{deepminisubid}"
  )
  .onUpdate((snapshot, context) => {
    let suparrayref = [];
    let picarrayref = [];
    let batch = db.batch();
    db.collection("tasks")
      .doc(context.params.id)
      .collection("PIC")
      .get()
      .then(picslist => {
        let q = 0;
        picslist.forEach(picdata => {
          picarrayref.push(
            db
              .collection("users")
              .doc(picdata.data().handle)
              .collection("notifications")
              .doc()
          );
          batch.set(picarrayref[q], {
            createdAt: new Date().toISOString(),
            read: false,
            type: "task",
            action: "updated",
            typeId: context.params.id
          });
          q++;
        });
        return db
          .collection("tasks")
          .doc(context.params.id)
          .collection("supervisors");
      })
      .then(supslist => {
        if (supslist.size > 1) {
          let w = 0;
          supslist.forEach(supdata => {
            if (supdata.data().handle !== snapshot.before.data().userHandle) {
              suparrayref.push(
                db
                  .collection("users")
                  .doc(supdata.data().handle)
                  .collection("notifications")
                  .doc()
              );
              batch.set(suparrayref[w], {
                createdAt: new Date().toISOString(),
                read: false,
                type: "task",
                action: "updated",
                typeId: context.params.id
              });
              w++;
            }
          });
        }
        return batch.commit();
      })
      .catch(err => {
        console.error(err);
        return true;
      });
  });

exports.notificationsOnUserMessages = functions.firestore
  .document("users/{id}/messages/{subcolid}")
  .onCreate((snapshot, context) => {
    if (context.params.subcolid) {
      let typeIO = "message";
      let actionIO = "created";
      let typeIdIO = context.params.subcolid;
      db.collection("users")
        .doc(context.params.id)
        .collection("notifications")
        .doc()
        .set({
          createdAt: new Date().toISOString(),
          read: false,
          type: typeIO,
          action: actionIO,
          sender: snapshot.data().userHandle,
          imageUrl: snapshot.data().imageUrl,
          typeId: typeIdIO
        })
        .catch(err => {
          console.error(err);
          return true;
        });
    } else return console.log(context.params.subcolid);
  });

exports.deleteNotificationOnMessageDelete = functions.firestore
  .document("users/{id}/messages/{subcolid}")
  .onDelete((snapshot, context) => {
    db.collection("users")
      .doc(context.params.id)
      .collection("notifications")
      .where("typeId", "==", context.params.subcolid)
      .limit(1)
      .delete()
      .then(() => {
        return true;
      })
      .catch(err => {
        console.error(err);
        return true;
      });
  });

exports.onProfileImageChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(change => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      let oldImageName = change.before
        .data()
        .imageUrl.split("/o/")[1]
        .split("?")[0];
      if (oldImageName === "noimage.png") {
      } else {
        admin
          .storage()
          .bucket()
          .file(oldImageName)
          .delete();
      }
      let batch = db.batch();
      return db
        .collection("screams")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { imageUrl: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });
