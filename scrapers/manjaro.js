var async = require('async');
var sugar = require('sugar');
var URL = require('url');

function first(a) { return a[0]; }
module.exports = function(request,callback) {
	var distribution = {
		id: 'manjaro',
		name: 'Manjaro',
		tags: ['hybrid'],
		url: 'http://manjaro.org/'
	};
	var url = 'http://sourceforge.net/projects/manjarolinux/files/release/';
	request.dom(url,function(err,$) {
		if (err) { return callback(err); }
		var versions = $('tr.folder th[headers=files_name_h] a.name').map(function(a) {
			a = $(a);
			return { url: URL.resolve(url,a.attr('href')), name: a.text().trim() };
		}).filter(function(version) {
			return /^(\d+\.)+\d+/.test(version.name);
		});
		async.map(versions,function(version,callback) {
			var url = version.url;
			request.dom(url,function(err,$) {
				if (err) { return callback(err); }
				var flavors = $('tr.folder th[headers=files_name_h] a.name').map(function(a) {
					a = $(a);
					return URL.resolve(url,a.attr('href'));
				});
				async.map(flavors,function(url,callback) {
					request.dom(url,function(err,$) {
						var files = $('tr.file th[headers=files_name_h] a.name').map(function(a) {
							a = $(a);
							var fileUrl = URL.resolve(url,a.attr('href'))
								.replace(/^https/,'http')
								.replace(/\/download$/,'');
							return { url: fileUrl, version: version.name };
						}).filter(function(file) {
							return /\.iso$/.test(file.url);
						}).map(function(file) {
							file.arch = /(i686|x86_64)/.exec(file.url)[0];
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
				},callback);
			});
		},function(err,files) {
			if (err) { return callback(err); }
			distribution.releases = files.flatten();
			callback(null,distribution);
		});
	});
};
