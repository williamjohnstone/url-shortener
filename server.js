'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var validator = require('validator');
var dns = require('dns');
var app = express();

var promise;

// Basic Configuration
var port = process.env.PORT || 3000;

// define schema
var idCounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    count: { type: Number, default: 0 }
});

var idCounter = mongoose.model('idCounter', idCounterSchema);

var urlSchema = new mongoose.Schema({
    _id: {type: Number},
    url: ''
});

urlSchema.pre('save', function(next) {
  var toSave = this;
  idCounter.findByIdAndUpdate({_id: 'url_id'}, { $inc: { count: 1} }, function(err, id) {
      if (err) {
        return next(err);
      };
      toSave._id = id.count;
      next();
  });
});

var shortURL = mongoose.model('shortURL', urlSchema);

/** this project needs a db !! **/
promise = mongoose.connect(process.env.MLAB_URI, {
  useMongoClient: true
});

promise.then(function(db) {
  idCounter.findOne({_id: 'url_id'}, function(err, doc) {
    if (err) {
      return;
    }
    if (!doc) {
      var counter = new idCounter({_id: 'url_id', count: 0});
        counter.save(function(err) {
            if(err) {
                return console.error(err);
            }
          });
    }
  });
});

app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post("/api/shorturl/new", function (req, res, next) {
  if (req.body.url) {
    const url = req.body.url
    if (!validator.isURL(url)) {
      return res.json({error: "Please input valid url!"});
      next();
    }
    shortURL.findOne({url: url}, function(err, doc) {
      if (doc) {
        res.json({original_url: url, short_url: "https://small-crane.glitch.me/api/shorturl/" + doc._id});
      } else {
        var toSave = new shortURL({
          url: url
        });
        toSave.save(function(err) {
          if (!err) {
            return res.json({original_url: url, short_url: "https://small-crane.glitch.me/api/shorturl/" + toSave._id});
          }
        });
      }
    });
  } else {
    return res.json({error: "Please include the 'url' parameter in your post body."});
  }
});

app.get("/api/shorturl/:id", function (req, res) {
  var id = req.params.id;
  if (id) {
    shortURL.findOne({_id: id }, function(err, doc) {
      if (doc) {
        res.redirect(doc.url);
      } else {
        res.json({error: "Specified url not found!"});
      }
    });
  }
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});
