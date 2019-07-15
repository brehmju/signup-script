var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var path = require('path');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views')); 

app.get('/getParticipants', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  MongoClient.connect("mongodb://localhost:27017", function(err, client) {
    if(!err) {
      var userCollection = client.db('kicker').collection('user');
      userCollection.find().toArray( function( err, userList ){
        if( !err ) {
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
          res.send(JSON.stringify({ "participants": userList }));
            return
        } else {
          res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
        }
      });
    } else {
      res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
    }
  });
});

app.get('/addParticipant', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.query.name == null) {
      res.send(JSON.stringify({ "error": true, "message": "no_name" }));
            return
      return
    }
    var name = req.query.name
    if (req.query.level == null) {
      res.send(JSON.stringify({ "error": true, "message": "no_level" }));
            return
      return
    }
    var level = req.query.level
    var lev = parseInt(level)
    if (lev == NaN || lev < 0 || lev > 100) {
      res.send(JSON.stringify({ "error": true, "message": "level_out_of_range" }));
            return
      return
    }
  MongoClient.connect("mongodb://localhost:27017", function(err, client) {
    if(!err) {
      var userCollection = client.db('kicker').collection('user');
        userCollection.find( { "name": name }, {limit: 1} ).toArray( function( err, user ){
          if( !err ) {
            if( user.length > 0 ){
                res.send(JSON.stringify({ "error": true, "message": "name_existing" }));
            return
            } else {
                client.db('kicker').collection('user').insertOne({
                  "name" : name,
                  "level" : level
                }, function(err, result) {
                  if(!err) {
                    res.send(JSON.stringify({ "success": true, "message": "participant_added" }));
            return
                  } else {
                    res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
                  }
                });
            }
          }
        });
      } else {
        res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
      }
    });
});

app.get('/deleteParticipant', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
    var name = req.query.name
    MongoClient.connect("mongodb://localhost:27017", function(err, client) {
          if (!err) {
            var userCollection = client.db('kicker').collection('user');
            userCollection.find( { "name": name }, {limit: 1} ).toArray( function( err, user ){
              if( !err ) {
                if( user.length > 0 ){
                  var userCollection = client.db('kicker').collection('user');
                  var query = { name: name };
                  userCollection.deleteOne(query, function(err, obj) {
                    res.send(JSON.stringify({ "success": true, "message": "participant_deleted" }));
                    return
                  });
                } else {
                  res.send(JSON.stringify({ "error": true, "message": "name_not_found" }));
            return
                }
              } else {
                res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
              }
            });
            
          } else {
            res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
          }
    });
});

app.get('/getTeams', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
    MongoClient.connect("mongodb://localhost:27017", function(err, client) {
          if(!err) {
            var userCollection = client.db('kicker').collection('user');
            userCollection.find().toArray( function( err, user ){
              if( !err ) {
                if(user.length % 2 != 0) {
                  res.send(JSON.stringify({ "error": true, "message": "number_of_participants_not_even" }));
                  return
                }
                var pairsForEachParticipant = [];
                for (var i = 0; i < user.length; i++) {
                  var pairs = [];
                  var name1 = user[i].name
                  var level1 = user[i].level
                  for (var j = 0; j < user.length; j++) {
                    var name2 = user[j].name
                    var level2 = user[j].level
                    if (name1 != name2){
                      var pair = [];
                      pair.push(name1) // 0
                      pair.push(name2) // 1
                      pair.push(parseInt(level1)) // 2
                      pair.push(parseInt(level2)) // 3
                      var teamLevel = parseInt(level1) + parseInt(level2)
                      pair.push(teamLevel) // 4
                      pairs.push(pair)
                    }
                  }
                  pairsForEachParticipant.push(pairs)
                }
                var teamsCombinations = [];
                var winnerIndex = 0;
                var winnerStandardDeviation = -1;
                for (var k = 0; k < pairsForEachParticipant.length; k++) {
                  var pairsFirst = pairsForEachParticipant[k] // Just do it with pairs of the first user
                  for (var r = 0; r < pairsFirst.length; r++) {
                    var sumLevels = 0
                    var teams = []
                    var teamsOutput = []
                    var nameList = []
                    var pairFirst = pairsFirst[r]
                    teams.push(pairFirst)
                    teamsOutput.push({"participant_1": {"name": pairFirst[0], "level": pairFirst[2]}, "participant_2": {"name": pairFirst[1], "level": pairFirst[3]}, "team_level": pairFirst[4]})
                    nameList.push(pairFirst[0])
                    nameList.push(pairFirst[1])
                    sumLevels += pairFirst[4] // Calculate sum of all levels
                    for (var a = 0; a < pairsForEachParticipant.length; a++) {
                      var pairsToCheck = pairsForEachParticipant[a]
                      for (var b = 0; b < pairsToCheck.length; b++) {
                        var pairToCheck = pairsToCheck[b]
                        var nameToCheckLeft = pairToCheck[0]
                        var nameToCheckRight = pairToCheck[1]
                        if(nameList.indexOf(nameToCheckLeft) < 0 && nameList.indexOf(nameToCheckRight) < 0) {
                          teams.push(pairToCheck)
                          teamsOutput.push({"participant_1": {"name": pairToCheck[0], "level": pairToCheck[2]}, "participant_2": {"name": pairToCheck[1], "level": pairToCheck[3]}, "team_level": pairToCheck[4]})
          
                          nameList.push(pairToCheck[0])
                          nameList.push(pairToCheck[1])
                          sumLevels += pairToCheck[4]
                        }
                      }
                    }
                    var meanLevels = sumLevels / teams.length // Calculate mean of all levels
                    var sumDistanceToMean = 0
                    for (var x = 0; x < teams.length; x++) {
                      var teamLevel = teams[x][4]
                      var distanceToMean = Math.pow(Math.abs(teamLevel - meanLevels), 2)
                      sumDistanceToMean += distanceToMean 
                      teams[x].push(distanceToMean) // 5
                    }
                    var sumDistanceToMeanDividedByN = sumDistanceToMean / teams.length
                    var standardDeviation = Math.sqrt(sumDistanceToMeanDividedByN)
                    // Save values
                    var teamsAndInfo = []
                    teamsAndInfo.push(sumLevels)
                    teamsAndInfo.push(meanLevels)
                    teamsAndInfo.push(sumDistanceToMean)
                    teamsAndInfo.push(sumDistanceToMeanDividedByN) 
                    teamsAndInfo.push(standardDeviation)
                    teamsAndInfo.push(teamsOutput)
                    if (winnerStandardDeviation < 0) {
                      winnerStandardDeviation = standardDeviation
                      winnerIndex = teamsCombinations.length
                    } else if (winnerStandardDeviation > standardDeviation) {
                      winnerStandardDeviation = standardDeviation
                      winnerIndex = teamsCombinations.length
                    }
                    teamsCombinations.push(teamsAndInfo)
                  } 
                }
                let winner = teamsCombinations[winnerIndex]
                res.send(JSON.stringify({
                  "sum_levels": winner[0],
                  "mean_levels": winner[1],
                  "sum_distance_to_mean": winner[2],
                  "sum_distance_to_mean_divided_by_n": winner[3],
                  "standard_eviation": winner[4],
                  "teams": winner[5]}));
                return
              } else {
                res.send(JSON.stringify({ "error": true, "message": "database_error" }));  
                return
              }
            });
          } else {
            res.send(JSON.stringify({ "error": true, "message": "database_error" }));
            return
          }
    });
});

app.listen(8447);