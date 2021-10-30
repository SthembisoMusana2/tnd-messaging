const{getFirestore,  getDocs, collection, addDoc } = require('firebase/firestore/lite');
const {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeApp } = require("firebase/app");

const firebaseConfig = {
  apiKey: "AIzaSyBcKUcXgtiKgou2rh7IDRbFqOA3gqm7gkw",
  authDomain: "tshepiso5562.firebaseapp.com",
  projectId: "tshepiso5562",
  storageBucket: "tshepiso5562.appspot.com",
  messagingSenderId: "250406312502",
  appId: "1:250406312502:web:f2161fb9608700d1625697"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const data_base = getFirestore(app);

async function createUser(email, password, username = ''){
    let userId = '';
    let status = '';
    await createUserWithEmailAndPassword(auth,email,password, username)
    .then(async ()=>{ 
        const docRef = await addDoc(collection(data_base, "users"), {
        username: username,
        email: email,
        password: password
        });
        userId = docRef.id;
    })
    .catch((err)=>{
        status = err.message;
    });

    return {username:username, email:email, id:userId, status:status};
}

 async function signIn(email, password){
     let userObj = {};
     let status = '';
    await signInWithEmailAndPassword(auth,email,password)
    .then(res=>{
        userObj.email = email;
        userObj.status = '';
    })
    .catch(err=>{
        userObj.status = err.message;
    });
    return userObj;
}

async function usersList(){
    const users = collection(data_base, 'users');
    const user_doc= await getDocs(users);
    const users_array = user_doc.docs.map(doc => doc.data());
    console.log(users_array);
    return users_array;
}
// console.log(signIn,createUser, usersList);
module.exports  = {signIn, createUser, usersList};
