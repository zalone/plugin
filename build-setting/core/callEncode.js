var exec = require('child_process').exec;


function callPython(path, res, prefix, key, cb) {
	exec('python ' + path + ' ' + res + ' ' + prefix + ' ' + key, function(error,stdout,stderr){
	    if(stdout.length >1){
	        // console.log('you offer args:',stdout);
	        cb(error,stderr)
	    } else {
	        // console.log('you don\'t offer args');
	    }
	    if(error) {
	        // console.info('stderr : '+stderr);
	        cb(error,stderr)
	    }
	});
}


module.exports = {
    build : function(path, res, prefix, key, cb){
        callPython(path, res, prefix, key, cb);
    }
}