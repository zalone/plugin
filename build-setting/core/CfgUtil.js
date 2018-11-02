var FS = require('fire-fs');
var path = require('path');
// const {remote} = require('electron');

let self = module.exports = {
    cfgData: {
        isCompress : true,
        isEncrypt : true,
        isManifest : true,
        encryptPrefix : "",
        encryptKey : "",
        version : "",
        packageUrl : "",
        manifestUUID : "",
    },
    setIsCompress(b) {
        this.cfgData.isCompress = b;
        this.saveConfig();
    },
    setIsEncrypt(b) {
        this.cfgData.isEncrypt = b;
        this.saveConfig();
    },
    setIsManifest(b) {
        this.cfgData.isManifest = b;
        this.saveConfig();
    },
    setConfig(encryptPrefix, encryptKey, version, packageUrl) {
        this.cfgData.encryptPrefix = encryptPrefix;
        this.cfgData.encryptKey = encryptKey;
        this.cfgData.version = version;
        this.cfgData.packageUrl = packageUrl;
        this.saveConfig();
    },
    setManifestUUID(uuid) {
        this.cfgData.manifestUUID = uuid;
        this.saveConfig();
    },

    //
    saveConfig() {
        let configFilePath = self._getAppCfgPath();
        FS.writeFile(configFilePath, JSON.stringify(this.cfgData), function (error) {
            if (!error) {
                Editor.log("保存配置成功!");
            }
        }.bind(this));
    },
    cleanConfig() {
        FS.unlink(this._getAppCfgPath());
    },
    _getAppCfgPath() {
        // let userDataPath = remote.app.getPath('userData');
        // let tar = Editor.libraryPath;
        // tar = tar.replace(/\\/g, '-');
        // tar = tar.replace(/:/g, '-');
        // tar = tar.replace(/\//g, '-');
        // return path.join(userDataPath, "build-setting-cfg-" + tar + ".json");
        return Editor.url('packages://build-setting/save/cfg.json');
    },
    initCfg(cb) {
        let configFilePath = this._getAppCfgPath();
        if (FS.existsSync(configFilePath)) {
            Editor.log("cfg path: " + configFilePath);
            // FS.readFile(configFilePath, 'utf-8', function (err, data) {
            //     if (!err) {
            //         let saveData = JSON.parse(data.toString());
            //         self.cfgData = saveData;
            //         if (cb) {
            //             cb(saveData);
            //         }
            //     }
            // }.bind(self));

            let data = FS.readFileSync(configFilePath, 'utf-8');
            let saveData = JSON.parse(data.toString());
            self.cfgData = saveData;
            if (cb) {
                cb(saveData);
            }

        } else {
            if (cb) {
                cb(null);
            }
        }
    }
};