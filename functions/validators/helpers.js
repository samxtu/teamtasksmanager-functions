exports.isEmpty = (string) =>{
    if(string.trim() === '') return true;
    else return false;
}

exports.isEmptyNum = (num) =>{
    if(!num) return true;
    else return false;
}

exports.isEmail = (email) =>{
    // regular expression must be correct 
    let regEx = "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$";
    if(email.match(regEx)) return true;
    else return false;
}

exports.reduceUserDetails = (data) => {
    let user = {};
    if(!isEmptys(data.bio.trim())) user.bio = data.bio.trim();
    if(!isEmptys(data.location.trim())) user.location = data.location.trim();
    if(!isEmptys(data.website.trim())) {
        if (data.website.trim().startsWith('http', 0)) {
            user.website = data.website.trim();
        } else{
            user.website = `http://${data.website.trim()}`;
        }
    }
    return user;
}