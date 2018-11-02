var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var async = require('async');

var manifest = {
    packageUrl: 'http://localhost/tutorial-hot-update/remote-assets/',
    remoteManifestUrl: 'http://localhost/tutorial-hot-update/remote-assets/project.manifest',
    remoteVersionUrl: 'http://localhost/tutorial-hot-update/remote-assets/version.manifest',
    version: '1.0.0',
    assets: {},
    searchPaths: [],
};

var src= '';

function readDir (dir, obj) {
    var stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
        return;
    }
    var subpaths = fs.readdirSync(dir), subpath, size, md5, compressed, relative;
    for (var i = 0; i < subpaths.length; ++i) {
        if (subpaths[i][0] === '.') {
            continue;
        }
        subpath = path.join(dir, subpaths[i]);
        stat = fs.statSync(subpath);
        if (stat.isDirectory()) {
            readDir(subpath, obj);
        }
        else if (stat.isFile()) {
            // Size in Bytes
            size = stat['size'];
            md5 = crypto.createHash('md5').update(fs.readFileSync(subpath, 'binary')).digest('hex');
            compressed = path.extname(subpath).toLowerCase() === '.zip';

            relative = path.relative(src, subpath);
            relative = relative.replace(/\\/g, '/');
            relative = encodeURI(relative);
            obj[relative] = {
                'size' : size,
                'md5' : md5
            };
            if (compressed) {
                obj[relative].compressed = true;
            }
        }
    }
}

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
}


module.exports = {
    build : function(version,packageUrl,remoteResUrl,assetsPath,uuid,cb){
        manifest.packageUrl = packageUrl;
        manifest.remoteManifestUrl = packageUrl + '/project.manifest';
        manifest.remoteVersionUrl = packageUrl + '/version.manifest';
        manifest.version = version;

        src = remoteResUrl;
        // Iterate res and src folder
        readDir(path.join(remoteResUrl, 'src'), manifest.assets);
        readDir(path.join(remoteResUrl, 'res'), manifest.assets);

        var destManifest = path.join(remoteResUrl, 'project.manifest');
        var destVersion = path.join(remoteResUrl, 'version.manifest');
        var assetManifest = path.join(assetsPath, 'project.manifest');
        if (uuid) {
            var outputhPath = remoteResUrl + "res/raw-assets/" + uuid.substr(0,2) + "/";
            var srcManifest = path.join(outputhPath, uuid + '.manifest');
        };

        mkdirSync(remoteResUrl);
        var manifestData = JSON.stringify(manifest);
        delete manifest.assets;
        delete manifest.searchPaths;
        var manifestData1 = JSON.stringify(manifest);
        async.parallel([
        function(cb){
            fs.writeFile(assetManifest, manifestData, cb);
        },
        function(cb){
            if (srcManifest) {
                fs.writeFile(srcManifest, manifestData, cb);
            }else{
                cb();
            };
        },
        function(cb){
            fs.writeFile(destManifest, manifestData, cb);
        },function(cb){
            fs.writeFile(destVersion, manifestData1, cb);
        }],function(err,result){
            cb(err,result)
        });
    }
}