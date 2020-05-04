const fs = require('fs');
const path = require('path');
const config = require("./config.json");
const paste = require("better-pastebin");
const Table = require('cli-table');
const delay = require('delay');
const stripAnsi = require('strip-ansi');

if (!fs.existsSync('./git')){
    fs.mkdirSync('./git');
}

const gitP = require('simple-git/promise');
const simpleGit = require('simple-git')(path.resolve(__dirname, 'git'));
const git = gitP(path.resolve(__dirname, 'git'))

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

git.checkIsRepo()
   .then(isRepo => !isRepo && initialiseRepo(git))
   .then(() => git.fetch());

function initialiseRepo (git) {
   return git.init()
      .then(() => git.addRemote('origin', 'https://github.com/inorichi/tachiyomi-extensions'))
}

async function update() {
        // pulls updates
    simpleGit.pull('origin', 'master');

    await delay(10000)

    getTable()

};


async function getTable() {
    // get current date and time
    let ts = Date.now();
        let date_ob = new Date(ts);
            let minute = date_ob.getMinutes();
            let hour = date_ob.getHours();
            let date = date_ob.getDate();
            let month = date_ob.getMonth();
            let year = date_ob.getFullYear();
            let timeZone = date_ob.toLocaleTimeString('en-us',{timeZoneName:'short'}).split(' ')[2];

    var table = new Table({
        head: ['EXTENSION   Date updated: '.concat(date.toString().concat("-".concat(month.toString().concat("-".concat(year.toString().concat(" ".concat(hour.toString().concat(":".concat(minute.toString().concat(" ".concat(timeZone.toString()))))))))))), 'SOURCE', 'LANGUAGE'],
        colWidths: [50, 45, 10]
    });


    var dirPath = path.resolve(__dirname, './git/src/all')
    
    
    // lists all directories
    getDirectories(dirPath).forEach(folder => { 
        var extensionPath = path.join(dirPath, folder, './src/eu/kanade/tachiyomi/extension/all', folder)
        // lists all files
        fs.readdir(extensionPath, function(err, files) {
            if (err) throw err;
            files.forEach(file => {
                // reads file
                if (file.includes('.kt')) {
                    fs.readFile(path.join(extensionPath, file), 'utf8', function(err, data) {
                        if (err) throw err;
                        var matches = data.matchAll(/(\S+?)\(\s*"(.*?)", "https:\/\/.*?", "([a-z]{2})"(?:, ".*?")?\)/g);
                        for (var match of matches) {
                            if (match[1] === "OtherSite") {match[1] = "Mangatensei"}
                            //console.log(match[1], match[2], match[3]);
                            table.push([match[1], match[2], match[3]]);
                        }
                        var matches = data.matchAll(/(\S+?)\(\s*"(.*?)", "http:\/\/.*?", "([a-z]{2})"(?:, ".*?")?\)/g);
                        for (var match of matches) {
                            if (match[1] === "OtherSite") {match[1] = "Mangatensei"}
                            //console.log(match[1], match[2], match[3]);
                            table.push([match[1], match[2], match[3]]);
                        }
                        var matches = data.matchAll(/"""\{"language":"(.*?)","name":"(.*?)","base_url":"(.*?)"/g);
                        for (var match of matches) {
                            var extensionName = folder
                            if (folder === "mmrcms") {extensionName = "MyMangaReaderCMS"}
                            //console.log(extensionName, match[2], match[1]);
                            table.push([extensionName, match[2], match[1]]);
                        }
                    });
                };
            });
        });
    }); 

    await delay (10000)
    //console.log(table.toString())
    uploadToPastebin(stripAnsi(table.toString()))
    
};

// timeout for main code
function run() {
    update();
    setInterval(update, 3600000);
};


function uploadToPastebin(inputString) {
    paste.setDevKey(config.pastebinToken);
    paste.login(config.pastebinUsername, config.pastebinPassword, function(success,data) {
        if(!success) {
            console.log("Failed (" + data + ")");
            return false;
        }

        paste.edit("XQkFhqTr", {
            contents: inputString
        }, function(success, data) {
            if(!success) {
                console.log("Failed (" + data + ")");
                return false;
            }
            console.log("Uploaded to Pastebin")
        });
    });
};

run();