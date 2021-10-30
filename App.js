let express = require('express');
const {signIn, createUser, usersList} = require('./signupLogin');

const mongoose = require('mongoose');
const UserModel = require('./UserSchema');

class User{
    constructor(username, email, id, imgR, historyList = []){
        this.username = username;
        this.id = id;
        this.email = email;
        this.imgUrl = imgR;
        this.historyList = []// the message History
        this.currentUser = null; // the current friend you are talking to
        this.cachedUsersList = []; // a short list of recent friends you've been talking to
        this.recentMessages = []; // recent messages sent to you by others
        this.friendsList = [] // list of friends you have on your account
        this.groupMessageList = [];
    }

    appendFriendList(user){
        this.friendsList.push(user);
        if(this.friendsList.length>0){
            this.friendsList.sort((user1, user2)=>{
                if(user1.username > user2.username)return -1;
                else if (user1.username < user2.username) return 1;
                return 0;
            });
        }
    }
    updateMessageList(message){
        this.recentMessages.push(message);
        this.historyList.push(message); // doesnt matter who the message is coming from just add it.
    }
    clearRecentList(){
        this.recentMessages.splice(0, this.recentMessages.length);
    }

    isRecentEmpty(){
        return (this.recentMessages.length === 0);
    }

    friendListToJSON(){
        let tempObject = {length:this.friendsList.length};
        if(tempObject.length > 0){
            for(let i=0; i<tempObject.length; i++){
                tempObject['friend '+i] = this.friendsList[i].toFJSON();
            }
            return(tempObject);
        }
        return {length:0};
        
    }

    friendsJSONToUserObjects(){
        if(this.cachedUsersList.length > 0){
            let tempFriendList = this.cachedUsersList[0];
            for(let i=0; i<tempFriendList.length; i++){
                let tUser = tempFriendList['friend '+i];
                let tUserObj = new User(tUser.username, tUser.email, tUser._id, tUser.avatar, []);
                this.appendFriendList(tUserObj);
            }
        }
    }

    recentListJSON(){
        if(!this.isRecentEmpty()){
            let tempObj = {};
            tempObj.length = this.recentMessages.length;
            for(let i=0; i<this.recentMessages.length; i++){
                tempObj['message'+i] = this.recentMessages[i]
            }
            return(tempObj);
        }
        return {length:0}; 
    }

    toJSON(){
        return({
            username:this.username,
            email:this.email,
            id:this.id,
            avatar:this.imgUrl,
            userId:this.id,
            messages:this.recentListJSON(),
            friends:this.friendListToJSON()
        });
    }

    toFJSON(){
        return({
            username:this.username,
            email:this.email,
            id:this.id,
            avatar:this.imgUrl,
            userId:this.id
        });
    }
}

class Group{
    constructor(name, participants = []){
        this.name = name;
        this.participants = participants; // list of participants
        this.id = null;
        this.messageHistory = [];
    }

    setMessageHistory(historyList){
        this.messageHistory= historyList;
    }
    appendMessage(message){
        this.messageHistory.push(message);
        for(let i = 0; i<this.participants.length; i++){
            this.participants[i].updateMessageList(message);
        }
    }
}

function searchArray(arrayObject = [], key, scheme='username'){
    // sort the array according to emails
    sortArrayUsers(arrayObject, scheme); // sort the array first to how you want to search it
    let tempObj = arrayObject[0];
    if(arrayObject.length > 0){
        if(tempObj[scheme] === key){
            return tempObj;
        }
        else{ // binary search algorithm
            
            if(arrayObject.length > 1){
                let middle = arrayObject[Math.floor(arrayObject.length/2)];
    
                if(middle[scheme] === key)
                    return middle;
                else if(key > middle[scheme]) // it means we should look from the second half
                    return searchArray(arrayObject.slice(Math.floor(arrayObject.length/2+1), 
                            arrayObject.length), key, scheme); // looking from the middle of the array
                else
                    // search the second half
                    return searchArray(arrayObject.slice(0, Math.floor(arrayObject.length/2)), key, scheme); 
            }else 
                return null;
        }
    }
    
}

function sortArrayUsers(array=[], scheme){
    array.sort((user1, user2)=>{
        if(user1[scheme]> user2[scheme])return 1;
        else if(user1[scheme] < user2[scheme])return -1;
        return 0;
    });
}

async function signUp(user={username:username, email:email, password:password}){
    let userObj = {}
    await createUser(user.email, user.password, user.username)
    .then(data=>{
        userObj = data;
        // console.log(data);
    });
    return userObj;
}

async function login(user={email:'', password:''}){
   return await signIn(user.email, user.password);
}

function toRegExp(str=''){
    let re = str.toLowerCase() + str.toUpperCase();
    let newBuf = [];
    let k = re.length/2;
    for(let j=0; j<k; j++){
        newBuf.push('['+re.charAt(j)+re.charAt(j+k)+']');
    }
    let regExp = newBuf.join('');
    return(new RegExp(regExp));
}

// setting up the server
let app = express();
const PORT = process.env.PORT;
const users = [];

const url = "mongodb+srv://Sthembiso:Stheshboi2C@cluster0.2hrhj.mongodb.net/TND?retryWrites=true&w=majority";

mongoose.connect(url, {useNewUrlParser:true, useUnifiedTopology:true})
.then(res=>{
    console.log('db connected')
    app.listen(PORT, function(){
        console.log('Listening on port'+PORT);
    });
}).catch(err=>{})

app.use(express.text());
app.use(express.urlencoded({extended:true}));

app.post('/signin', (req, res)=>{ // register to the active users list
    res.setHeader('Access-Control-Allow-Origin', '*');
    if(JSON.parse(req.body)!= null){
        let resBody = JSON.parse(req.body);
        if(searchArray(users, resBody.username) == null){ // add them to the active users list
            let tempUser = new User(resBody.username,resBody.userEmail, resBody.userId);
            users.push(tempUser);
            res.end('Approved');
            return;
        }
    }  
});

app.post('/users', (req, res)=>{ // request for your friend list
    res.setHeader('Access-Control-Allow-Origin', '*');
    let user = JSON.parse(req.body);
    let userObj = searchArray(users, user.username);
    if(userObj!= null) res.end(JSON.stringify(userObj.friendListToJSON()));    
    else res.end(JSON.stringify({length:0}))
});

app.post('/send', (req, res)=>{
    let messageRef = JSON.parse(req.body);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // route message from one user to the next
    if(messageRef.recipientType === 'single'){
        let recipient  = messageRef.recipient;
        let user = searchArray(users, recipient, 'email');
        if( user != null){
            let sender = searchArray(user.friendsList, messageRef.sEmail, 'email');
            if(sender == null){
                let senderO = searchArray(users, messageRef.sEmail, 'email');
                user.appendFriendList(senderO);
            }
            user.updateMessageList(messageRef);
            messageRef.status = 'sent'
            res.end(JSON.stringify(messageRef));
            console.log('sent Message', messageRef)
            return;
        }else{
            UserModel.findOne({email:recipient})
            .then((dbRes)=>{
                if(dbRes.length > 0){
                    let tempUser = new User(dbRes.username, dbRes.email, dbRes._id, dbRes.avatar, dbRes.messages, []);
                    tempUser.cachedUsersList.push(dbRes.friends);
                    users.push(tempUser);
                    tempUser.updateMessageList(messageRef);
                    messageRef.status = 'sent'
                    res.end(JSON.stringify(messageRef));
                } 
            })
            .catch(err=>{console.log(err)})
        }
        
    }
    else if(messageRef.recipientType === 'group'){
        let groupName = messageRef.group.name;
        let group = searchArray(groups, groupName);
        // route message to every user in the group ... 
        group.updateMessageList(messageRef);
        messageRef.status = 'sent';
        res.end(JSON.stringify(messageRef));
        return;
    }
});

app.post('/poll', (req, res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    let userRef = JSON.parse(req.body);
    let user = searchArray(users, userRef.username);
    if(user != null){
        if(!user.isRecentEmpty()){
            res.end(JSON.stringify(user.recentListJSON()));
            user.clearRecentList();
            return;
        }
        else{
            res.end(JSON.stringify({length:0}));
            return;
        }
    }
    res.end(JSON.stringify({status:'User not found!'}));
});

app.post('/addFriend', (req, res)=>{
    let user = JSON.parse(req.body);
    let userObj = searchArray(users, user.email, 'email');
    let owner = searchArray(users, user.owner, 'email');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if(userObj == null){
        UserModel.findOne({email:user.email})
            .then((dbRes)=>{
                let id = dbRes._id.toString();
                let tempUser = new User(dbRes.username, dbRes.email, id, dbRes.avatar, dbRes.messages);
                tempUser.cachedUsersList.push(dbRes.friends);
                users.push(tempUser);
                let test = searchArray(owner.friendsList, user.email, 'email');
                if(test == null) owner.appendFriendList(tempUser);
                res.end(JSON.stringify(tempUser.toFJSON()));
            })
            .catch(err=>{console.log(err)})
    }
    else{
        let test = searchArray(owner.friendsList, user.email, 'email');
        if(test == null) owner.appendFriendList(userObj);
        res.end(JSON.stringify(userObj.toFJSON()));
    }

    UserModel.findOneAndReplace(owner.id, owner.toJSON())
    .then(res=>{console.log('Friend Added Successfully to ->', owner.username, res)})
    .catch(err=>{console.log(err);});
});

app.post('/search', (req, res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    let searchData = JSON.parse(req.body);
    let userObj = null;//searchArray(users, searchData.name);
    if(userObj != null){
        let tempJSON = {}
        tempJSON.length = 1;
        tempJSON.user0 = userObj.toFJSON();
        res.end(JSON.stringify(tempJSON));
        return;
    }
    else{
        UserModel.find({username:toRegExp(searchData.name)})
        .then((dbRes)=>{
            if(dbRes.length > 0){
                let tempJSON = {};
                tempJSON['length'] = dbRes.length;
                let j = 0;
                for(let user of dbRes){
                    tempJSON['user'+j] = user;
                    j++;
                }
                res.end(JSON.stringify(tempJSON));
            }
            else{
                res.end(JSON.stringify({length:0}));
            }
        })
        .catch(err=>{
            console.log(err);
        });
        return;
    }
});

app.post('/signup', (req, res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    let userFormData = JSON.parse(req.body);
    signUp(userFormData, res)
    .then(user=>{
        if(user.status == 'Firebase: Error (auth/email-already-in-use).'){
            res.write('Email already in use $');
            res.end(JSON.stringify(user));
        }
        else if( user.status == 'Firebase: Error (auth/invalid-email).'){
            res.write('Invalid Email address$');
            res.end(JSON.stringify(user));
        }
        else if(user.status === ''){
            // back up the user information in the database
            res.write('Sign Up Successful$');
            res.end(JSON.stringify(user));
            let tempUser = new User(user.username, user.email, user.id, userFormData.avatar, []);
            // console.log(tempUser);
            users.push(tempUser); // add the user to the local list
            let UserMod = new UserModel(tempUser.toJSON());
            UserMod.save()
            .then(()=>{})
            .catch(err=>{console.log(err)})
        }
    });
});

app.post('/login', (req, resp)=>{
    let userFormData = JSON.parse(req.body);
    login(userFormData)
    .then(async res=>{
        resp.setHeader('Access-Control-Allow-Origin', '*');
        if(res.status == ''){ // the login was successful
            
            resp.write('successful$');
            let userSearch = searchArray(users, res.username);
            if(userSearch == null){
                await UserModel.findOne({email:userFormData.email})
                .then((dbRes)=>{
                    let id = dbRes._id.toString();
                    let tempUser = new User(dbRes.username, dbRes.email, id, dbRes.avatar, dbRes.messages);
                    tempUser.cachedUsersList.push(dbRes.friends);
                    tempUser.friendsJSONToUserObjects();
                    users.push(tempUser);
                    resp.end(JSON.stringify(tempUser.toJSON())); 
                })
                .catch(err=>{console.log(err)})
            }else{
                resp.end(JSON.stringify(userSearch.toJSON())); 
            }
        }
        else{
            resp.write('failed$');
            res.status = res.status.split(':')[1];
            resp.end(JSON.stringify(res));
        }
    })
    .catch(err=>{});
});