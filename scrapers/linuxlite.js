var async = require('async');
var sugar = require('sugar');
var URL = require('url');

function first(a) { return a[0]; }
module.exports = function(request,callback) {
	var distribution = {
		id: 'linuxlite',
		name: 'Linux Lite',
		tags: ['hybrid'],
		url: 'http://www.linuxliteos.com/'
	};
	var url = 'http://sourceforge.net/projects/linuxlite/files/';
	request.dom(url,function(err,$) {
		if (err) { return callback(err); }
		var versions = $('th[headers=files_name_h] a.name').map(function(a) {
			a = $(a);
			return { url: URL.resolve(url,a.attr('href')), name: a.text().replace(/\s+/g,'') };
		}).filter(function(version) {
			return /^(\d+(\.\d+)*(-\d+)?)$/g.test(version.name);
		});
		async.map(versions,function(version,callback) {
			var url = version.url;
			request.dom(url,function(err,$) {
				if (err) { return callback(err); }
				var files = $('th[headers=files_name_h] a.name').map(function(a) {
					a = $(a);
					var fileUrl = URL.resolve(url,a.attr('href'))
						.replace(/^https/,'http')
						.replace(/\/download$/,'');
					return { url: fileUrl, version: version.name };
				}).filter(function(file) {
					return /\.iso$/.test(file.url);
				}).map(function(file) {
					file.arch = /(32bit|64bit|i386|i486|i686|amd64)/.exec(file.url)[0];
					return file;
				});
				async.map(files,function(file,callback) {
					request.contentlength(file.url,function(err,contentLength) {
						if (err) { return callback(err); }
						file.size = contentLength;
						callback(null,file);
					});
				},callback);
			});
		},function(err,files) {
			if (err) { return callback(err); }
			distribution.releases = files.flatten();
			callback(null,distribution);
		});
	});
};
