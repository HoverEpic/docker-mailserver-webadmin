'use strict';
//init app
const xss = require("xss");
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
const auth = require('basic-auth');
const fs = require('fs-extra');
const util = require('util');
const moment = require('moment');
const async = require('async');
const archiver = require('archiver');

// override console
var log = console.log;
console.log = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);
    log.apply(console, [new Date().toISOString().replace('T', ' ').substr(0, 19) + " > " + first_parameter].concat(other_parameters));
};
var error = console.error;
console.error = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);
    error.apply(console, [new Date().toISOString().replace('T', ' ').substr(0, 19) + " > " + first_parameter].concat(other_parameters));
};

const HOST = "0.0.0.0";
const PORT = 8080;

const CONFIG_DIR = "./dms_data/config";
const MAIL_DATA_DIR = "./dms_data/mail-data";
const MAIL_STATE_DIR = "./dms_data/mail-state";

//var AUTH = ["username": {
//                "password": "password"
//            }]

var app = express();

// enable POST request decoding
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({// to support URL-encoded bodies
    extended: true
}));

// templating
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

//security
app.use(helmet());
app.disable('x-powered-by');

app.listen(PORT, HOST, function () {
    console.log(`Running on http://${HOST}:${PORT}`);
});

process.on('SIGINT', function () {
    process.exit(0);
});

var check_auth = function (req, res, result) {
    return result(true);
//    var user = auth(req);
//    if (!user || !AUTH[user.name] || AUTH[user.name].password !== user.pass) {
//        res.statusCode = 401;
//        res.setHeader('WWW-Authenticate', 'Basic realm="example"');
//        res.end('Access denied');
//        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//        console.log("access denied for " + ip + " user=" + (!user ? "undefined" : user.name));
//        return result(false);
//    } else {
//        return result(user);
//    }
};

// the main page
app.get('/', function (req, res) {
    check_auth(req, res, function (result) {
        if (result)
            res.sendFile(path.join(__dirname + '/public/index.html'));
        else
            res.status(403).send();
    });
});

//get domains
app.get('/domains', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';

            get_domains(limit, offset, order.toUpperCase(), sort, search, function (results) {
                res.send(JSON.stringify({rows: results, total: results.length}));
            });
        } else
            res.status(403).send();
    });
});
//get users
app.get('/users', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';

            get_users(limit, offset, order.toUpperCase(), sort, search, function (results) {
                res.send(JSON.stringify({rows: results, total: results.length}));
            });
        } else
            res.status(403).send();
    });
});
//get users
app.get('/alias', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var limit = req.query.limit || 10;
            var offset = req.query.offset || 0;
            var order = req.query.order || 'asc';
            var sort = req.query.sort || 'id';
            var search = req.query.search || '';

            get_alias(limit, offset, order.toUpperCase(), sort, search, function (results) {
                res.send(JSON.stringify({rows: results, total: results.length}));
            });
        } else
            res.status(403).send();
    });
});


// functions
var get_domains = function (limit, offset, sort, order, search, callback) {
    var results = [];
    getDirAsync(MAIL_DATA_DIR, function (domains_result) {
        if (domains_result.length > 0) {
            var j = 0;
            for (var i = offset; i < (domains_result.length > limit ? limit : domains_result.length); i++) {
                if (domains_result[i].includes(search)) {
                    results[j] = {};
                    results[j].name = domains_result[i];
                    //TODO get user, alias, mails & KDIM
                    results[j].users_count = getDirSync(MAIL_DATA_DIR + "/" + domains_result[i]).length;
//                    var k = 0;
//                    var alias_result = readFileSync(CONFIG_DIR + "/postfix-virtual.cf");
//                    console.log(alias_result.length);
//                    if (alias_result.length > 0) {
//                        for (var i = offset; i < (alias_result.length > limit ? limit : alias_result.length); i++) {
//                            var line = alias_result[i].toString();
//                            var address = line.split(" ");
//                            var to_parts = address[1].split("@");
//                            if (to_parts[1] === domains_result[i])
//                                k++;
//                        }
//                    }
//                    results[j].alias_count = k;
                    results[j].mails_count = humanFileSize(getTotalSize(MAIL_DATA_DIR + "/" + domains_result[i]), false);
                    results[j].kdim_created = fs.existsSync(CONFIG_DIR + "/opendkim/keys/" + domains_result[i] + "/mail.private");
                    j++;
                }
            }
        }
        callback(results);
    });
};
var get_users = function (limit, offset, sort, order, search, callback) {
    var results = [];
    readFileAsync(CONFIG_DIR + "/postfix-accounts.cf", function (users_result) {
//        console.log(users_result.length);
        if (users_result.length > 0) {
            var j = 0;
            for (var i = offset; i < (users_result.length > limit ? limit : users_result.length); i++) {
                var line = users_result[i].toString();
                if (line.includes(search)) {
                    var address = line.split("|")[0];
                    var parts = address.split("@");
                    results[j] = {};
                    results[j].domain = parts[1];
                    results[j].name = parts[0];
                    //TODO get alias, mails
//                    results[j].mails_count = humanFileSize(getTotalSize(MAIL_DATA_DIR + "/" + parts[1] + "/" + parts[0]), false);
                    results[j].mails_count = "0 KiB";
                    results[j].can_receive = true;
                    results[j].can_send = true;
                    results[j].admin = false;
                    j++;
                }
            }
        }
        callback(results);
    });
};
var get_alias = function (limit, offset, sort, order, search, callback) {
    var results = [];
    readFileAsync(CONFIG_DIR + "/postfix-virtual.cf", function (alias_result) {
//        console.log(users_result.length);
        if (alias_result.length > 0) {
            var j = 0;
            for (var i = offset; i < (alias_result.length > limit ? limit : alias_result.length); i++) {
                var line = alias_result[i].toString();
                if (line.includes(search)) {
                    var address = line.split(" ");
                    var to_parts = address[1].split("@");
                    results[j] = {};
                    results[j].name = to_parts[0];
                    results[j].domain = to_parts[1];
                    results[j].destination = address[0];
                    j++;
                }
            }
        }
        callback(results);
    });
};


// read dir async
const getDirAsync = (source, callback) =>
    fs.readdir(source, {withFileTypes: true}, (err, files) => {
        if (err) {
            callback(err)
        } else {
            callback(
                    files
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name)
                    );
        }
    });
//read dir sync
const getDirSync = source =>
    fs.readdirSync(source, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
//read asyn file
const readFileAsync = (file, callback) =>
    fs.readFile(file, 'utf8', function read(err, data) {
        if (err) {
            throw err;
        }
        callback(data.split("\n").filter(function (line) {
            return line.trim();
        }));
    });
//read file sync
//const readFileSync = file =>
//    fs.readFileSync(file, {encoding: 'utf8', flag: 'r'}).toString().split("\n");
const readFileSync = file =>
    fs.readFileSync(file, {encoding: 'utf8', flag: 'r'}).split("\n").filter(function (line) {
        return line.trim();
    });

const getAllFiles = function (dirPath, arrayOfFiles) {
    var files = [];

    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(__dirname, dirPath, file));
        }
    });

    return arrayOfFiles;
};

const getTotalSize = function (directoryPath) {
    const arrayOfFiles = getAllFiles(directoryPath);

    let totalSize = 0;

    arrayOfFiles.forEach(function (filePath) {
        totalSize += fs.statSync(filePath).size;
    });

    return totalSize;
};

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

//var test = get_users(10, 0, "order.toUpperCase()", "sort", "", function (results) {});
