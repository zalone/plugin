var FS = require("fire-fs");
var PATH = require('fire-path');
var fse = require('fs-extra');
var rimraf = require('rimraf');
var Electron = require('electron');
var CfgUtil = Editor.require("packages://build-setting/core/CfgUtil");

Editor.Panel.extend({
    style: FS.readFileSync(Editor.url('packages://build-setting/panel/index.css', 'utf8')) + "",
    template: FS.readFileSync(Editor.url('packages://build-setting/panel/index.html', 'utf8')) + "",

    $: {
        logTextArea: '#logTextArea',
    },

    ready() {
        let logCtrl = this.$logTextArea;
        let logListScrollToBottom = function () {
            setTimeout(function () {
                logCtrl.scrollTop = logCtrl.scrollHeight;
            }, 10);
        };

        window.plugin = new window.Vue({
            el: this.shadowRoot,
            created() {
                Editor.log("created");
                this.initPlugin();
            },
            data: {
                logView : [],
                isCompress : true,
                isEncrypt : true,
                isManifest : true,
                encryptPrefix : "",
                encryptKey : "",
                version : "",
                packageUrl : "",
                manifestUUID : "",
            },
            methods: {
                _addLog(str) {
                    let time = new Date();
                    this.logView += "[" + time.toLocaleString() + "]: " + str + "\n";
                    logListScrollToBottom();
                },
                _addLogNoTime(data) {
                    this.logView += data;
                    logListScrollToBottom();
                },

                initPlugin() {
                    CfgUtil.initCfg(function (data) {
                        if (data) {
                            this.isCompress = data.isCompress;
                            this.isEncrypt = data.isEncrypt;
                            this.isManifest = data.isManifest;
                            this.encryptPrefix = data.encryptPrefix;
                            this.encryptKey = data.encryptKey;
                            this.version = data.version;
                            this.packageUrl = data.packageUrl;
                            this.manifestUUID = data.manifestUUID;
                        }
                    }.bind(this));
                },
                
                onLogViewMenu(event) {
                    Editor.log("onLogViewMenu");
                    Editor.Ipc.sendToMain('build-setting:popup-create-menu', event.x, event.y, null);
                },

                queryBuildOptions(a) {
                },

                onCompress() {
                    this.isCompress = !this.isCompress;
                    CfgUtil.setIsCompress(this.isCompress);
                    this._addLog('图片压缩选项: ' + this.isCompress);
                    // Editor.Ipc.sendToMain('build-setting:setFlagCompress', this.isCompress);
                },

                onEncrypt() {
                    this.isEncrypt = !this.isEncrypt;
                    CfgUtil.setIsEncrypt(this.isEncrypt);
                    this._addLog('图片加密选项: ' + this.isEncrypt);
                    // Editor.Ipc.sendToMain('build-setting:setFlagEncrypt', this.isEncrypt);
                },
                
                onManifest() {
                    this.isManifest = !this.isManifest;
                    CfgUtil.setIsManifest(this.isManifest);
                    this._addLog('生成热更文件: ' + this.isManifest);
                    // Editor.Ipc.sendToMain('build-setting:setFlagManifest', this.isManifest);
                },

                onSaveCfg() {
                    CfgUtil.setConfig(this.encryptPrefix, this.encryptKey, this.version, this.packageUrl);

                },
                onManifestUUID() {
                    CfgUtil.setManifestUUID(this.manifestUUID);

                    this._addLog("manifestUUID: " + this.manifestUUID);
                },

                onModified() {
                    if (!this.encryptPrefix || !this.encryptKey) {
                        this._addLog("请输入加密前缀和key");
                        return
                    };
                    if (this.encryptKey.length > 1) {
                        this._addLog("key的长度要为1");
                        return
                    };
                    this._addLog("开始修改CCImage!");
                    
                    let hFilePath = PATH.join(__dirname, "../cocos2d-x/cocos/platform/CCImage.h");
                    if (!FS.existsSync(hFilePath)) {
                        window.plugin._addLog("没有发现文件: " + hFilePath);
                        return;
                    }
                    let filedata = FS.readFileSync(hFilePath, 'utf-8');
                    let str = 
                        "public:\n\n" +
                        "    ssize_t mydecode(const unsigned char * data, ssize_t dataLen, unsigned char ** outBuffer);"

                    if (filedata.indexOf(str) === -1) {
                        filedata = filedata.replace("public:", str);
                        window.plugin._addLog("[CCImage.h] 添加成功");
                    } else {
                        window.plugin._addLog("[CCImage.h] 已经添加");
                    }

                    FS.writeFileSync(hFilePath, filedata);

                    //
                    let cppFilePath = PATH.join(__dirname, "../cocos2d-x/cocos/platform/CCImage.cpp");
                    if (!FS.existsSync(cppFilePath)) {
                        window.plugin._addLog("没有发现文件: " + cppFilePath);
                        return;
                    }
                    let data = FS.readFileSync(cppFilePath, 'utf-8');

                    let flag1 = 
                        "ssize_t unpackedLen = 0;\n\n" +
                        "        unsigned char* decodeData = nullptr;\n" +
                        "        dataLen = mydecode(data, dataLen, &decodeData);\n" +
                        "        if(decodeData)\n" +
                        "        {data = decodeData;}\n"
                        
                    if (data.indexOf(flag1) === -1) {
                        data = data.replace("ssize_t unpackedLen = 0;", flag1);
                        window.plugin._addLog("[CCImage.cpp] 添加 decodeData 成功");
                    } else {
                        window.plugin._addLog("[CCImage.cpp] 已经添加 decodeData");
                    }
                    //
                    let flag2 = 
                        "if(decodeData)\n" +
                        "        {free(decodeData);}\n\n" +
                        "        if(unpackedData != data)"
                        
                    if (data.indexOf(flag2) === -1) {
                        data = data.replace("if(unpackedData != data)", flag2);
                        window.plugin._addLog("[CCImage.cpp] 添加 free 成功");
                    } else {
                        window.plugin._addLog("[CCImage.cpp] 已经添加 free");
                    }

                    //
                    let flag3 = 
                        "ssize_t Image::mydecode(const unsigned char * data, ssize_t dataLen, unsigned char ** outBuffer)\n" +
                        "{\n" +
                        "    int preLen = " + this.encryptPrefix.length + ";\n" + 
                        "    if(dataLen<=(preLen+1) || memcmp(data, \"" + this.encryptPrefix + "\", preLen) != 0)  //是否加密的标记\n" +
                        "        return dataLen;\n" +
                        "    ssize_t len = dataLen-preLen-1;\n" +
                        "    *outBuffer = (unsigned char*)malloc( len );\n" +
                        "    unsigned char key = data[preLen];\n" +
                        "    for(ssize_t i=0;i<len;i++)\n" +
                        "        (*outBuffer)[i] = data[i+preLen+1] ^ key;  //最简单的xor, 自己改算法\n" +
                        "    return len;\n" +
                        "}\n\n" +
                        "bool Image::isPng(const unsigned char * data, ssize_t dataLen)"
                        
                    if (data.indexOf(flag3) === -1) {
                        if (data.indexOf("ssize_t Image::mydecode(const unsigned char * data, ssize_t dataLen, unsigned char ** outBuffer)")) {
                            
                            data = data.replace(new RegExp("ssize_t Image::mydecode\\(const unsigned char \\* data, ssize_t dataLen, unsigned char \\*\\* outBuffer\\)\n\\{[^}]*\\}\n\nbool Image::isPng\\(const unsigned char \\* data, ssize_t dataLen\\)"), flag3);
                            window.plugin._addLog("添加过，改变秘钥");
                        } else{
                            data = data.replace("bool Image::isPng(const unsigned char * data, ssize_t dataLen)", flag3);
                            window.plugin._addLog("[CCImage.cpp] 添加 mydecode 成功");
                        };
                        
                    } else {
                        window.plugin._addLog("[CCImage.cpp] 已经添加 mydecode");
                    }

                    FS.writeFileSync(cppFilePath, data);
                },
            }
        })
    },

    // register your ipc messages here
    messages: {
        'build-setting:cleanLog'(event) {
            window.plugin.logView = [];
        },
        'build-setting:queryBuildOptions'(event) {
            window.plugin.queryBuildOptions(a);
        },

    }
});
