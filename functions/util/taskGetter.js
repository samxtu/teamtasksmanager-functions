const { db, admin } = require("./admin");

exports.getTask = async (taskRefId, taskStatus) => {
    console.log("i have been called to fetch task with id: "+taskRefId+" and status: "+taskStatus)
    let dataGets = []
    let task = {}
    return db.doc(`/tasks/${taskRefId}`).get()
    .then(taskData=>{
        if(taskData.data().status == taskStatus){
            console.log("found task: "+taskRefId)
            task.taskId = taskData.id
            task = taskData.data()
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
            .doc(taskRefId)
            .collection("PIC")
            .get()
            .then(PICList=>{
                task.PIC = []
                if(PICList.size > 0){
                PICList.forEach(PICData=>{
                    task.PIC.push(PICData.data())
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
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("supervisors")
                .get()
                .then(supervisorList=>{
                    task.supervisors = []
                    if(supervisorList.size > 0){
                        supervisorList.forEach(supervisorData=>{
                            task.supervisors.push(supervisorData.data())
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
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("comments")
                .get()
                .then(commentList=>{
                    task.comments = []
                    if(commentList.size > 0){
                        commentList.forEach(commentData=>{
                            task.comments.push({commentId: commentData.id,...commentData.data()})
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
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("files")
                .get()
                .then(filesList=>{
                    task.files = []
                    if(filesList.size > 0){
                        filesList.forEach(filesData=>{
                            task.files.push(filesData.data())
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
        dataGets.push(new Promise((resolve,reject)=>{
            db.collection("tasks")
                .doc(taskRefId)
                .collection("taskResponses")
                .get()
                .then(taskResponsesList=>{
                    task.taskResponses = []
                    let resarray = []
                    let tempRes = []
                    let i = 0
                    if(taskResponsesList.size > 0){
                        console.log("This task have "+taskResponsesList.size+" responses")
                        taskResponsesList.forEach(async taskResponsesData=>{
                            resarray.push(new Promise(async (resolve,reject) =>{
                                await getTaskResponse(taskResponsesData,taskRefId)
                                .then((feed)=>{
                                    tempRes[i] = feed
                                    task.taskResponses.push(tempRes[i])
                                    resolve(tempRes[i])
                                })
                            }))
                            i = i + 1;
                        })
                    }
                    Promise.all(resarray).then(()=>{
                        return true
                    })
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
            console.log("function found the task as below:"+ taskRefId)
            console.log(task)
            return true
        })
        }
        return task;
    })
    .catch(err =>{
        console.error(err)
    })
}

exports.getTaskResponse = async (data,taskId) => {
    let taskResponse = {}
    let responseGets = []
    taskResponse.taskResponseId = data.id
    taskResponse = data.data()
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("files")
            .get()
            .then(filesList=>{
                if(filesList.size > 0){
                taskResponse.files = []
                filesList.forEach(filesData=>{
                    taskResponse.files.push(filesData.data())
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
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("comments")
            .get()
            .then(commentsList=>{
                if(commentsList.size > 0){
                taskResponse.comments = []
                commentsList.forEach(commentsData=>{
                    taskResponse.comments.push({commentId:commentsData.id,...commentsData.data()})
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
    responseGets.push(new Promise((resolve,reject)=>{
        db.collection("tasks")
            .doc(taskRefId)
            .collection("taskResponses")
            .doc(taskResponse.id)
            .collection("responses")
            .get()
            .then(responseList=>{
                taskResponse.responses = []
                let responsesarray = []
                let resz = []
                let j = 0
                if(responseList.size > 0){
                    console.log("This task response have "+responseList.size+" responses")
                    responseList.forEach(async responseData=>{
                        responsesarray.push(new Promise(async (resolve, reject)=>{
                            await getResponseResponse(responseData,taskResponse.id,taskId)
                            .then((feed)=>{
                                resz[j] = feed
                                taskResponse.responses.push(resz[j])
                                resolve(resz[j])
                            })
                        }))
                        j++;
                    })
                }
                Promise.all(responsesarray).then(()=>{
                    return true
                })
            })
            .then(()=>{
                return resolve(true)
            })
            .catch(err=>{
                console.error(err)
            })
    }))
    return Promise.all(responseGets)
    .then(()=>{
        return taskResponse;
    })
    .catch(err=>{
        console.error(err)
    })
}

exports.getResponseResponse = async (data,taskResponseId,taskId) => {
    let response = {}
    let reresponseGets = []
    response.responseResponseid = data.id
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
                        response.comments.push({commentId:commentData.id,...commentData.data()})
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
    return Promise.all(reresponseGets)
    .then(()=>{
        return response;
    })
    .catch(err =>{
        console.error(err)
    })
}