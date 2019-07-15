var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var path = require('path');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views')); 

var teamCombinations = [];
var bestCombination = {team: [], varianz: Number.MAX_VALUE};

app.get('/', function(req, res) {
  MongoClient.connect("mongodb://localhost:27017", function(err, client) {
    if(!err) {
      var userCollection = client.db('kicker').collection('user');
      userCollection.find().toArray( function( err, userList ){
        if( !err ) {
          var name = req.query.name
          var level = req.query.level
          var sort = req.query.sort
          if(sort != null && sort == "ascending") {
            userList.sort(function(a, b) {
              return b.level - a.level;
            });
          } else if(sort != null && sort == "descending") {
            userList.sort(function(a, b) {
              return a.level - b.level;
            });
          }
          if(name == null || name == "") {
            res.render('index', { sort: sort, user: userList, message: "Hey, please insert a name below:" });
          } else {
            userCollection.find( { "name": name }, {limit: 1} ).toArray( function( err, user ){
              if( !err ) {
                if( user.length > 0 ){
                  res.render('index', { sort: sort, user: userList, message: "Sorry, the name is existing - please choose a different one!" });
                } else {
                  var lev = parseInt(level)
                  if (lev == NaN || lev < 0 || lev > 100) {
                    res.render('index', { sort: sort, user: userList, message: "Hey, stop cheating!" });
                  } else {
                    client.db('kicker').collection('user').insertOne({
                      "name" : name,
                      "level" : level
                    }, function(err, result) {
                      if(!err) {
                        res.render('thanks', { sort: sort, message: "", name: name, level: level });
                      } else {
                        res.render('index', { sort: sort, user: [], message: "Sorry, a database error occured..." });
                      }
                    });
                  }
                }
              } else {
                res.render('index', { sort: sort, user: [], message: "Sorry, a database error occured..." });
              }
            });
          }
        } else {
          res.render('index', { sort: sort, user: [], message: "Sorry, a database error occured..." });
        }
      });
    } else {
      res.render('index', { sort: sort, user: [], message: "Sorry, a database error occured..." });
    }
  });
});

app.get('/manage', function(req, res) {
    MongoClient.connect("mongodb://localhost:27017", function(err, client) {
          if(!err) {
            var userCollection = client.db('kicker').collection('user');
            userCollection.find().toArray( function( err, user ){
              if( !err ) {
                res.render('list', { message: "", user: user });
              } else {
                res.render('list', { message: "Sorry, a database error occured...", user: [] });
              }
            });
          } else {
            res.render('list', { message: "Sorry, a database error occured...", user: [] });
          }
    });
});

app.get('/delete', function(req, res) {
    var name = req.query.name
    MongoClient.connect("mongodb://localhost:27017", function(err, client) {
          if (!err) {
            var userCollection = client.db('kicker').collection('user');
            var query = { name: name };
            userCollection.deleteOne(query, function(err, obj) {
              res.redirect('/manage');
            });
          } else {
            res.redirect('/manage');
          }
    });
});

app.get('/teams', function(req, res) {
    MongoClient.connect("mongodb://localhost:27017", function(err, client) {
          if(!err) {
            var userCollection = client.db('kicker').collection('user');
            userCollection.find().toArray( function( err, players ){
              if( !err ) {
                if(players.length % 2 != 0) {
                  res.send("The number of participants must be even!");
                } else {
                  findBestPlayerCombination(players, teamCombinations);
                  res.render('winner', { message: "", bestCombination: bestCombination });
                }

              } else {
                res.render('teams', { combinations: [], message: "Sorry, a database error occured..." });  
              }
            });
          } else {
            res.render('teams', { combinations: [], message: "Sorry, a database error occured..." });
          }
    });
});

function findBestPlayerCombination(players, teamCombinations) {
    if(players.length <= 2) {
        let lastPair = {player1: players[0].name, player2: players[1].name, level: parseInt(players[0].level) + parseInt(players[1].level)};
        let team = teamCombinations.concat([lastPair]);
        let varianz = computeVarianz(team)
        //console.log(team, varianz);
        if(bestCombination.varianz > computeVarianz(team)) {
            bestCombination.team = team;
            bestCombination.varianz = varianz;
        }
    }
    else {
        let player1 = players.shift();
        for(let i = 0; i < players.length; ++i) {
            let player2 = players.splice(i,1)[0];
            teamCombinations.push({player1: player1.name, player2: player2.name, level: parseInt(player1.level) + parseInt(player2.level)})
            findBestPlayerCombination(players.slice(), teamCombinations);
            teamCombinations.pop();
            players.splice(i, 0, player2);
        }
    }
}

function computeVarianz(team) {
    let average = computeAverage(team);
    let varianz = 0;
    let counter = 0;
    for(; counter < team.length; ++counter) {
        varianz += Math.pow(team[counter].level - average, 2);
    }
    varianz /= counter;
    return Math.sqrt(varianz);
}

function computeAverage(team) {
    var average = 0;
    let counter = 0;
    for(; counter < team.length; ++counter) {
        average += team[counter].level;
    }
    average /= counter;
    return average;
}

app.listen(8447);