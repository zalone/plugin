'use strict';

var path = require('path');
var fs = require('fs');
var CfgUtil = require('./core/CfgUtil');

var utils = require('./core/utils');
var child_process = require("child_process");
var resPath = '';
var fileList = [];

function onBuildStart(options, callback) {
    initPlugin();

    callback();
}

function onBeforeChangeFiles(options, callback) {

    if (self.info.flagCompress) {
        resPath = options.dest + "/res/";

        if(utils.checkIsExistProject(resPath)){
            fileList = utils.loadPngFiles();
            compressionPng(callback);
        }
    } else{
        Editor.log("不执行图片压缩");
        callback();
    };

}

function compressionPng(callback) {
    Editor.success("pngquant start!")

    let index = 0;

    let url = ""
    if (cc.sys.os == "OS X") {
        url = 'packages://build-setting/tool/mac/pngquant';
    } else if (cc.sys.os == "Windows"){
        url = 'packages://build-setting/tool/windows/pngquant';
    };
    let pngquant_path = Editor.url(url);
    let cmd = pngquant_path + " --transbug --force 256 --ext .png";

    let item = fileList[index];

    let exe_cmd = cmd + ' ' + item.path;

    var totalSizeEX = 0;
    var totalSize = 0;

    function exec() {
        child_process.exec(exe_cmd, { timeout: 3654321 }, function (error, stdout, stderr) {
            if (stderr) {
                Editor.error("pngquant error : " + stderr);
                //return;
            }

            let file_path = item.path.replace(resPath, " ");
            let afterSize = getFileState(item.path).size;
            totalSizeEX = totalSizeEX + item.size;
            totalSize = totalSize + afterSize;
            Editor.log(`[${file_path}] 原始大小:${item.size} B,压缩后大小:${afterSize} B,压缩率:${(afterSize/item.size*100).toFixed(2)}%`);

            if (index < fileList.length - 1) {
                
                index++;
                item = fileList[index];
                exe_cmd = cmd + ' ' + item.path;
                
                exec();
            } else {
                Editor.success("pngquant finished!");
                Editor.log(`压缩完成,原始总大小${(totalSizeEX/1000).toFixed(2)}KB:, 压缩后总大小${(totalSize/1000).toFixed(2)}KB:,总压缩率:${(totalSize/totalSizeEX*100).toFixed(2)}%`);
                callback && callback.call();
            }
        });
    }

    exec();
}

function getFileState(res_path) {
    return fs.lstatSync(res_path);
}

function onBeforeBuildFinish (options, callback) {
    
    var dest = options.dest.replace(/\\/g,'/');
    var folder = dest.substring(dest.lastIndexOf('/'))+'/';

    function createManifest() {
        if (self.info.flagManifest) {
            addHotUpdateSearchPaths(options.dest);

            //version.txt本身没用,作用在于写入文件后构建完成会重新载入该插件,防止重新构建时报错
            var versionPath = path.resolve(__dirname, 'core/version.txt');
            fs.writeFileSync(versionPath,"version1");

            var Generator = require('./core/version_generator');
            Generator.build(self.info.version, 
                self.info.packageUrl, 
                options.buildPath+folder, 
                options.project+'/assets/',
                self.info.manifestUUID,
                function(err,res){
                    Editor.log('热更新资源打包结果:',err?'失败':'成功');
                    if(err){
                        Editor.log('error:',err);
                    }
                    callback() ;
            });
        } else{
            Editor.log("不生成热更文件");
            callback();
        };
    }

    if (self.info.flagEncrypt) {
        if(options.platform == 'android' || options.platform == 'ios' || options.platform == 'win32'){

            var callEncode = require('./core/callEncode');
            var scriptPath = options.project + "/packages/build-setting/core/encode.py";

            callEncode.build(scriptPath, options.buildPath+folder+'res', 
                self.info.encryptPrefix, self.info.encryptKey,
                function(err,res){
                    Editor.log('图片加密结果:',err?'失败':'成功');
                    if(err){
                        Editor.log('error:',err);
                        callback();
                    } else {
                        createManifest();
                    }
            })

        } else {
            callback();
        }
    } else{
        Editor.log("不执行图片加密");
        createManifest();
    };
    
}

function addHotUpdateSearchPaths(dest) {

    var mainJsPath = path.join(dest, 'main.js');
    var script = fs.readFileSync(mainJsPath, 'utf8');

    var newStr =
        "if (jsb) { \n" + 
        "    var hotUpdateSearchPaths = localStorage.getItem('HotUpdateSearchPaths'); \n" +
        "    if (hotUpdateSearchPaths) { \n" + 
        "        jsb.fileUtils.setSearchPaths(JSON.parse(hotUpdateSearchPaths)); \n" + 
        "    }\n" +
        "}\n";
    script = newStr + script;
    fs.writeFileSync(mainJsPath, script);
    Editor.log("添加热更搜索路径成功");
}

function initPlugin() {
    CfgUtil.initCfg(function (data) {
        if (data) {
            self.info.flagCompress = data.isCompress;
            self.info.flagEncrypt = data.isEncrypt;
            self.info.flagManifest = data.isManifest;
            self.info.encryptPrefix = data.encryptPrefix;
            self.info.encryptKey = data.encryptKey;
            self.info.version = data.version;
            self.info.packageUrl = data.packageUrl;
            self.info.manifestUUID = data.manifestUUID;
            Editor.log(self.info);
        }
    }.bind(self));
}

let self = module.exports = {
    load() {
        Editor.Builder.on('build-start', onBuildStart);
        Editor.Builder.on('before-change-files', onBeforeChangeFiles);
        Editor.Builder.on('build-finished', onBeforeBuildFinish);
    },

    unload() {
        Editor.Builder.removeListener('build-start', onBuildStart);
        Editor.Builder.removeListener('before-change-files', onBeforeChangeFiles);
        Editor.Builder.removeListener('build-finished', onBeforeBuildFinish);
    },

    info: {
        flagCompress : true,
        flagEncrypt : true,
        flagManifest : true,
        encryptPrefix : "",
        encryptKey : "",
        version : "",
        packageUrl : "",
        manifestUUID : "",
    },

    // register your ipc messages here
    messages: {
        'open'() {
            // open entry panel registered in package.json
            Editor.Panel.open('build-setting');
        },
        'popup-create-menu'(event, x, y, data) {
            let electron = require('electron');
            let BrowserWindow = electron.BrowserWindow;
            let template = [
                {
                    label: '清空日志', click() {
                    Editor.Ipc.sendToPanel('build-setting', 'build-setting:cleanLog', data);
                }
                },
                // {type: 'separator'},
            ];
            let editorMenu = new Editor.Menu(template, event.sender);

            x = Math.floor(x);
            y = Math.floor(y);
            editorMenu.nativeMenu.popup(BrowserWindow.fromWebContents(event.sender), x, y);
            editorMenu.dispose();
        },
        'builder:query-build-options'(event){
            Editor.Ipc.sendToPanel('build-setting', 'build-setting:queryBuildOptions', event);
        },

        // 'setFlagCompress' (event, flag) {
        //     this.info.flagCompress = flag;
        //     // Editor.log('setFlagCompress:' + flag);
        // },
        // 'setFlagEncrypt' (event, flag) {
        //     this.info.flagEncrypt = flag;
        //     // Editor.log('setFlagEncrypt:' + flag);
        // },
        // 'setFlagManifest' (event, flag) {
        //     this.info.flagManifest = flag;
        //     // Editor.log('setFlagManifest:' + flag);
        // },
        
    },
};