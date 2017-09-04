'use strict';
const fs = require('fs');
const express = require('express');
const app = express();
const httpsConfig = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
  rejectUnauthorized: false
};
const https = require('https');
const httpolyglot = require('httpolyglot');
const server = httpolyglot.createServer(httpsConfig, app);
const bodyParser = require('body-parser');
const exec = require('child_process').exec;
const mysql = require('mysql');
const nodesData = require('/etc/load_balancer/nodes_data_conf.json');

var nodeQueue = [];
var jobQueue = [];
const serverHostname = nodesData.serverInfo.hostname;
const serverPort = nodesData.serverInfo.port;
const gitlabHostname = nodesData.gitlab.hostname;
var connection;
var i;

server.listen(nodesData.hostPort.port);
console.log('Listening at ' + nodesData.hostPort.port);

app.use(bodyParser.json());

app.get('/userCheck', function (req, res) {
  console.log('userCheck requested');
  res.send(true);
});

app.get('/connectionCheck', function (req, res) {
  console.log('connectionCheck requested');
  var result = 'Load Balancer Working\n',
    numOfNodes = nodesData.Nodes.length;

  function dispResult() {
    res.send(result);
  }

  function checkNodeConn(node) {
    var options = {
      host: node.hostname,
      port: node.port,
      path: '/connectionCheck',
      key: fs.readFileSync('./ssl/key.pem'),
      cert: fs.readFileSync('./ssl/cert.pem'),
      rejectUnauthorized: false
    },
    //send a get request and capture the response
      reqCheckNodeConn = https.request(options, function (res) {
      // Buffer the body entirely for processing as a whole.
        var bodyChunks = [];
        res.on('data', function (chunk) {
          bodyChunks.push(chunk);
        }).on('end', function () {
          var body = Buffer.concat(bodyChunks);
          result = result.concat('<br/>Execution Node at ' + node.hostname + ':' + node.port + ' working: ' + body);
          console.log('nodeing');
          //return if all requets processed
          numOfNodes = numOfNodes - 1;
          if (numOfNodes === 0) {
            console.log('DispRes');
            dispResult();
          }
        });
      });
    reqCheckNodeConn.on('error', function (e) {
      result = result.concat('<br/>Execution Node at  ' + node.hostname + ':' + node.port + ' Error: ' + e.message);
      //return if all requets processed
      numOfNodes = numOfNodes - 1;
      if (numOfNodes === 0) {
        console.log('DispRes');
        dispResult();
      }
    });
    reqCheckNodeConn.end();
  } //checkNodeConnection ends

  //Check connection of all nodes
  for (i = 0; i < nodesData.Nodes.length; i = i + 1) {
    console.log(numOfNodes);
    checkNodeConn(nodesData.Nodes[i]);
  }
});

app.post('/submit', function (req, res) {
  console.log('submit post request received');
  console.log(req.body);
  res.send(true);

  if (nodeQueue.length !== 0) {
    console.log(nodeQueue.length + ' ' + jobQueue.length);
    var assignedNode = nodeQueue.pop(),
      assignedHostname = assignedNode.hostname,
      assignedPort = assignedNode.port,
      body = JSON.stringify(req.body),
      httpsJobOptions = {
        hostname: assignedHostname,
        port: assignedPort,
        path: '/requestRun',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        key: fs.readFileSync('./ssl/key.pem'),
        cert: fs.readFileSync('./ssl/cert.pem'),
        rejectUnauthorized: false
      },

      request = https.request(httpsJobOptions, function (response) {
        response.on('data', function (chunk) {
          console.log(chunk);
        });
      });

    request.on('error', function (error) {
      console.log(error);
    });

    request.end(body);
  } else {
    jobQueue.push(req.body);
  }
});

app.post('/sendScores', function (req, res) {
  console.log('sendScores post request received');
  var submissionJson = req.body.submission_details,
    nodeJson = req.body.node_details,
    body,
    httpsJobOptions,
    request,
    assignedNode,
    assignedHostname,
    assignedPort,
    array,
    q,
    q1,
    totalScore,
    codeDownloadFlag,
    tableName,
    execCommand;
  nodeQueue.push(nodeJson);
  res.send(true);
  if (jobQueue.length !== 0) {
    assignedNode = nodeQueue.pop();
    assignedHostname = assignedNode.hostname;
    assignedPort = assignedNode.port;
    body = JSON.stringify(jobQueue.pop());
    httpsJobOptions = {
      hostname: assignedHostname,
      port: assignedPort,
      path: '/requestRun',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      key: fs.readFileSync('./ssl/key.pem'),
      cert: fs.readFileSync('./ssl/cert.pem'),
      rejectUnauthorized: false
    };

    request = https.request(httpsJobOptions, function (response) {
      response.on('data', function (chunk) {
        console.log(chunk);
      });
    });

    request.on('error', function (error) {
      console.log(error);
    });

    request.end(body);

  }

  body = JSON.stringify(submissionJson);
  httpsJobOptions = {
    hostname: serverHostname,
    port: serverPort,
    path: '/results',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
    rejectUnauthorized: false
  };

  request = https.request(httpsJobOptions, function (response) {
    response.on('data', function (chunk) {
      console.log(chunk);
    });
  });

  request.on('error', function (error) {
    console.log(error);
  });
  request.end(body);

  array = submissionJson.marks;
  if (submissionJson.status ===  1 || submissionJson.status === 2) {
    totalScore = 0;
    for (i = 0; i < array.length; i = i + 1) {
      totalScore = totalScore + parseInt(array[i], 10);
    }
    totalScore = totalScore - parseInt(submissionJson.penalty, 10);
    if (totalScore < 0) {
      totalScore = 0;
    }

    codeDownloadFlag = 0;
    tableName = 'l' + submissionJson.Lab_No;
    q = 'SELECT * FROM ' + tableName + ' WHERE id_no = \'' + submissionJson.id_no + '\'';
    connection.query(q, function (err, rows, fields) {
      if (err) {
        console.log(err);
      }
      if (rows === undefined || rows.length === 0) {
        q1 = 'INSERT INTO ' + tableName + ' VALUES (\'' + submissionJson.id_no + '\', ' + totalScore + ',\'' + submissionJson.time + '\')';
        connection.query(q1, function (err, rows, fields) {
          console.log(err);
        });
        codeDownloadFlag = 1;
      } else {
        if (rows[0].score < totalScore) {
          q1 = 'UPDATE ' + tableName + ' SET score=' + totalScore + ', time=\'' + submissionJson.time + '\' WHERE id_no=\'' + submissionJson.id_no + '\'';
          connection.query(q1, function (err, rows, fields) {
            console.log(err);
          });
          codeDownloadFlag = 1;
        }
      }
      if (codeDownloadFlag === 1) {
        execCommand = 'bash savecode.sh ';
        execCommand = execCommand.concat(submissionJson.id_no + ' ' + submissionJson.Lab_No + ' ' + gitlabHostname + ' ' + submissionJson.commit);
        exec(execCommand, function (error, stdout, stderr) {
          console.log(error);
          console.log(stdout);
          console.log(stderr);
        });
      }
    });
  }
});

app.post('/addNode', function (req, res) {
  console.log('addNode post request received');
  res.send(true);
  // Check if the Execution node is already accounted for in the queue,return if it is.
  for (i = 0; i < nodeQueue.length; i = i + 1) {
    if (nodeQueue[i].hostname === req.body.hostname && nodeQueue[i].port === req.body.port) {
      return;
    }
  }

  console.log(req.body);
  nodeQueue.push(req.body);
  console.log('Added ' + req.body.hostname + ':' + req.body.port + ' to queue');
  if (jobQueue.length !== 0) {
    var assignedNode = nodeQueue.pop(),
      assignedHostname = assignedNode.hostname,
      assignedPort = assignedNode.port,
      body = JSON.stringify(jobQueue.pop()),
      httpsJobOptions = {
        hostname: assignedHostname,
        port: assignedPort,
        path: '/requestRun',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        key: fs.readFileSync('./ssl/key.pem'),
        cert: fs.readFileSync('./ssl/cert.pem'),
        rejectUnauthorized: false
      },
      request = https.request(httpsJobOptions, function (response) {
        response.on('data', function (chunk) {
          console.log(chunk);
        });
      });

    request.on('error', function (error) {
      console.log(error);
    });

    request.end(body);

  }
});

try {
  connection = mysql.createConnection(nodesData.database);
  connection.connect();
} catch (e) {
  console.log(e);
}

function checkNodeConn(node) {
  var httpsCheckConn = {
    hostname: node.hostname,
    port: node.port,
    path: '/connectionCheck',
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
    rejectUnauthorized: false
  },
    checkConnRequest = https.request(httpsCheckConn, function (res) {
      var bodyChunks = [];
      res.on('data', function (chunk) {
        bodyChunks.push(chunk);
      }).on('end', function () {
        var body = Buffer.concat(bodyChunks);
        if (body.toString() === 'true') {
          console.log('Added ' + node.hostname + ':' + node.port + ' to queue');
          nodeQueue.push(node);
        }
      });
    });

  checkConnRequest.on('error', function (err) {
    console.log('Error connecting to ' + node.hostname + ':' + node.port + ' ' + err);
  });

  checkConnRequest.end();
}

for (i = 0; i < nodesData.Nodes.length; i = i + 1) {
  checkNodeConn(nodesData.Nodes[i]);
}

setInterval(function () {
  connection.query('SELECT 1', function (err, rows, fields) {
    if (err) {
      console.log('Error connecting to the database');
    } else {
      console.log('keep alive query');
    }
  });
}, 10000);

module.exports = {
  app: app,
  server: server,
  nodeQueue: nodeQueue,
  jobQueue: jobQueue
};
