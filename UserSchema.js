let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// create new Schema object
let UserSchema = new Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    userId:{
        type:String
    },
    friends:{
        type:{}
        // required:true
    },
    messages:{
        type:{},
        // required:true
    },
    avatar:{
        type:String
    }
}, {timestamps:true});

// create a new Model for the Schema
let UserModel = mongoose.model('user', UserSchema); // grab the 'Blog' collection

module.exports =  UserModel;
