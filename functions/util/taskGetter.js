const { db, admin } = require("./admin");

module.exports = (taskRefId, taskStatus) => {
    let dataGets = []
    db.doc(`/tasks/${taskRefId}`).get()
    .then(taskData=>{
        if(taskData.data().status == taskStatus){
            let task = {}
            task = taskData.data()
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
            .doc(taskRefId)
            .collection("PIC")
            .get()
            .then(PICList=>{
                task.PIC = []
                PICList.forEach(PICData=>{
                    task.PIC.push(PICData.data())
                })
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
        }))
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("supervisors")
                .get()
                .then(supervisorList=>{
                    task.supervisors = []
                    supervisorList.forEach(supervisorData=>{
                        task.supervisors.push(supervisorData.data())
                    })
                    return true
                })
                .then(()=>{
                    return resolve(true)
                })
                .catch(err=>{
                    console.error(err)
                })
        }))
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("comments")
                .get()
                .then(commentList=>{
                    task.comments = []
                    commentList.forEach(commentData=>{
                        task.comments.push(commentData.data())
                    })
                    return true
                })
                .then(()=>{
                    return resolve(true)
                })
                .catch(err=>{
                    console.error(err)
                })
        }))
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("files")
                .get()
                .then(filesList=>{
                    task.files = []
                    filesList.forEach(filesData=>{
                        task.files.push(filesData.data())
                    })
                    return true
                })
                .then(()=>{
                    return resolve(true)
                })
                .catch(err=>{
                    console.error(err)
                })
        }))
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("taskResponses")
                .get()
                .then(taskResponsesList=>{
                    task.taskResponses = []
                    if(taskResponsesList.size > 0){
                        taskResponsesList.forEach(taskResponsesData=>{
                            task.taskResponses.push(getTaskResponse(taskResponsesData,taskRefId))
                        })
                    }
                    return true
                })
                .then(()=>{
                    return resolve(true)
                })
                .catch(err=>{
                    console.error(err)
                })
        }))
        Promise.all(dataGets)
        .then(()=>{
            return task;
        })
        } else return null;
    })
    .catch(err =>{
        console.error(err)
    })
}

const getTaskResponse = (data,taskId) => {
    let taskResponse = {}
    let responseGets = []
    taskResponse.id = data.id
    taskResponse = data.data()
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("files")
            .get()
            .then(filesList=>{
                taskResponse.files = []
                filesList.forEach(filesData=>{
                    taskResponse.files.push(filesData.data())
                })
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("comments")
            .get()
            .then(commentsList=>{
                taskResponse.comments = []
                commentsList.forEach(commentsData=>{
                    taskResponse.comments.push(commentsData.data())
                })
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskRefId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("responses")
            .get()
            .then(responseList=>{
                taskResponse.responses = []
                if(responseList.size > 0){
                    responseList.forEach(responseData=>{
                        taskResponse.responses.push(getResponseResponse(responseData,taskResponse.id,taskId))
                    })
                }
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    Promise.all(responseGets)
    .then(()=>{
        return taskResponse;
    })
    .catch(err=>{
        console.error(err)
    })
}

const getResponseResponse = (data,taskResponseId,taskId) => {
    let response = {}
    let reresponseGets = []
    response.id = data.id
    response = data.data()
    reresponseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponseId)
            .collection("responses")
            .doc(response.id)
            .collection("files")
            .get()
            .then(filesList=>{
                response.files = []
                if(filesList.exists){
                    filesList.forEach(filesData=>{
                        response.files.push(filesData.data())
                    })
                }
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    reresponseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponseId)
            .collection("responses")
            .doc(response.id)
            .collection("comments")
            .get()
            .then(commentsList=>{
                response.comments = []
                if(commentsList.exists){
                    commentsList.forEach(commentData=>{
                        response.comments.push(commentData.data())
                    })
                }
                return true
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    Promise.all(reresponseGets)
    .then(()=>{
        return response;
    })
    .catch(err =>{
        console.error(err)
    })
}