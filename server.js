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
const dockerCLI = require('docker-cli-js');

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

const DOCKER_MAILSERVER_NAME = "mailserver";

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

//Docker
var DockerOptions = dockerCLI.Options;
var Docker = dockerCLI.Docker;
var docker = new Docker({
    machineName: undefined, // uses local docker
    currentWorkingDirectory: undefined, // uses current working directory
    echo: false, // echo command output to stdout/stderr
    env: undefined,
    stdin: undefined,
});

//TODO Basic auth
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
app.put('/users', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var user_name = req.body.user_name || "";
            var existing_user_name = req.body.user_name || "";
            var domain_name = req.body.domain_name || "";
            var user_password = req.body.user_password || "";
            var user_can_receive = req.body.user_can_receive || "";
            var user_can_send = req.body.user_can_send || "";
            var user_is_admin = req.body.user_is_admin || "";
            console.log(user_can_receive);
            if (existing_user_name === "") {//add new user
                docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup email add ' + user_name + '@' + domain_name + ' ' + user_password).then(function (data, err) {
                    if (err)
                        res.send(JSON.stringify({error: err}));
                    else
                        res.send(JSON.stringify({message: "User added !"}));
                });
            } else if (user_password !== "") {//update password user
                docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup email update ' + user_name + '@' + domain_name + ' ' + user_password).then(function (data, err) {
                    if (err)
                        res.send(JSON.stringify({error: err}));
                    else
                        res.send(JSON.stringify({message: "User added !"}));
                });
            } else {
                //TODO set user restrictions
            }
        } else
            res.status(403).send();
    });
});
app.delete('/users', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var names = req.body.names || [];
            if (names.length === 0)
                res.status(200).send();
            else {
                for (let i = 0; i < names.length; i++) {
                    docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup email del ' + names[i]).then(function (data, err) {});
                }
                res.send(JSON.stringify({message: "Users(s) deleted !"}));
            }
        } else
            res.status(403).send();
    });
});
//get alias
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
app.put('/alias', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var alias_address = req.body.alias_address || "";
            var alias_destination = req.body.alias_destination || "";
            docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup alias add ' + alias_address + ' ' + alias_destination).then(function (data, err) {
                if (err)
                    res.send(JSON.stringify({error: err}));
                else
                    res.send(JSON.stringify({message: "Alias added !"}));
            });
        } else
            res.status(403).send();
    });
});
app.delete('/alias', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            var alias = req.body.alias || [];
            if (alias.length === 0)
                res.status(200).send();
            else {
                for (let i = 0; i < alias.length; i++) {
                    docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup alias del ' + alias[i]).then(function (data, err) {});
                }
                res.send(JSON.stringify({message: "Alias deleted !"}));
            }
            //error
        } else
            res.status(403).send();
    });
});
app.get('/dkim', function (req, res) {
    check_auth(req, res, function (result) {
        if (result) {
            gen_dkim(function (results) {
                res.send(JSON.stringify({results}));
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
            var domain_index = 0;
            for (var i = offset; i < (domains_result.length > limit ? limit : domains_result.length); i++) {
                if (domains_result[i].includes(search)) {
                    results[domain_index] = {};
                    results[domain_index].domain_name = domains_result[i];
                    results[domain_index].users_count = getDirSync(MAIL_DATA_DIR + "/" + domains_result[i]).length;
                    var alias_count = 0;
                    var alias_file_lines = readFileSync(CONFIG_DIR + "/postfix-virtual.cf");
                    if (alias_file_lines.length > 0) {
                        for (var j = offset; j < (alias_file_lines.length > limit ? limit : alias_file_lines.length); j++) {
                            var line = alias_file_lines[j].toString();
                            var address = line.split(" ");
                            var to_parts = address[1].split("@");
                            if (to_parts[1] === domains_result[i])
                                alias_count++;
                        }
                    }
                    results[domain_index].alias_count = alias_count;
                    results[domain_index].mails_count = humanFileSize(getTotalSize(MAIL_DATA_DIR + "/" + domains_result[i]), false);
                    results[domain_index].kdim_created = fs.existsSync(CONFIG_DIR + "/opendkim/keys/" + domains_result[i] + "/mail.private");
                    //TODO find how to gat public key
//                    if (results[domain_index].kdim_created)
//                        results[domain_index].kdim_public = readFileSync(CONFIG_DIR + "/opendkim/keys/" + domains_result[i] + "/mail.txt");
                    domain_index++;
                }
            }
        }
        callback(results);
    });
};
var get_users = function (limit, offset, sort, order, search, callback) {
    var results = [];
    readFileAsync(CONFIG_DIR + "/postfix-accounts.cf", function (users_result) {
        if (users_result.length > 0) {
            var alias_file_lines = readFileSync(CONFIG_DIR + "/postfix-virtual.cf");
            var j = 0;
            for (var i = offset; i < (users_result.length > limit ? limit : users_result.length); i++) {
                var line = users_result[i].toString();
                if (line.includes(search)) {
                    var address = line.split("|")[0];
                    var parts = address.split("@");
                    results[j] = {};
                    results[j].user_address = address;
                    //get alias
                    results[j].user_mails_count = humanFileSize(getTotalSize(MAIL_DATA_DIR + "/" + parts[1] + "/" + parts[0]), false);
                    var alias = [];
                    var l = 0;
                    if (alias_file_lines.length > 0) {
                        for (var k = 0; k < alias_file_lines.length; k++) {
                            var line = alias_file_lines[k].toString();
                            var alias_line = line.split(" ");
                            var destination = alias_line[1];
                            if (destination === address) {
                                alias[l] = alias_line[0];
                                l++;
                            }
                        }
                    }
                    results[j].user_alias = alias;
                    //TODO get user restrictions
                    results[j].can_receive = true;
                    results[j].can_send = true;
                    //TODO create admin system
                    results[j].user_is_admin = false;
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
        if (alias_result.length > 0) {
            var j = 0;
            for (var i = offset; i < (alias_result.length > limit ? limit : alias_result.length); i++) {
                var line = alias_result[i].toString();
                if (line.includes(search)) {
                    var address = line.split(" ");
                    results[j] = {};
                    results[j].alias = address[0];
                    results[j].destination = address[1];
                    j++;
                }
            }
        }
        callback(results);
    });
};
var gen_dkim = function (callback) {
    docker.command('exec ' + DOCKER_MAILSERVER_NAME + ' setup config dkim').then(function (data, err) {
        if (!err)
            callback(true);
        else
            callback({error: err});
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
