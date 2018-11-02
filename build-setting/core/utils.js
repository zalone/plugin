var path = require("path");
var fs = require("fs");

var res_path = null;
var list = [];

class utils {

    static checkIsExistProject(resPath){
        res_path = resPath;

        try{
            let state = fs.lstatSync(resPath);
            
            return state.isDirectory();
        }catch(error){
            Editor.error("目录不存在");

            return false;
        }   
        
    }

    static loadPngFiles(){
        if(!res_path) return;
        list = [];
        let state = fs.lstatSync(res_path);
        if(state.isDirectory()){
            utils.scanFiles(res_path);
        }
        return list;
    }

    static getImageStat(image_path){
        return fs.lstatSync(res_path);
    }

    static scanFiles(dir){
        
        let files = fs.readdirSync(dir);
        
        for(let i = 0; i < files.length; i++){
            let file = files[i];
            let file_path = path.join(dir, file);
            let stat = fs.lstatSync(file_path);
            if(stat.isDirectory()){
                utils.scanFiles(file_path);
            }else{
                if(utils.isPng(file_path)){
                    let item = {
                        path: file_path,
                        size: stat.size,
                        name: file,
                    }
                    list.push(item);
                }
            }
        }
    }

    static isPng(fileName){
        if (path.extname(fileName).toLocaleLowerCase() == ".png") {
            return true
        } else {
            return false
        }
    }
}

module.exports = utils
